import { app, BrowserWindow, desktopCapturer, globalShortcut, ipcMain, net, protocol, screen } from "electron";
import { readFile, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { createGoogleTranslationProvider } from "../../src/providers/translation/google";
import { createDeepLTranslationProvider } from "../../src/providers/translation/deepl";
import { createOpenAiTranslationProvider } from "../../src/providers/translation/openai";
import { translateText } from "../../src/background/pipeline";
import type { TranslationContextLine } from "../../src/shared/types";
import { DEFAULT_SETTINGS, normalizeSettings } from "./settings";
import type { DesktopSettings } from "./bridge";

protocol.registerSchemesAsPrivileged([{
  scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
}]);

let settings: DesktopSettings = DEFAULT_SETTINGS;
let control: BrowserWindow;
let overlay: BrowserWindow;
let subtitle = "";
let overlayVisible = true;
const rendererRoot = resolve(__dirname, "renderer");
const settingsFile = () => join(app.getPath("userData"), "settings.json");

async function loadSettings() {
  try { settings = normalizeSettings(JSON.parse(await readFile(settingsFile(), "utf8"))); }
  catch { settings = DEFAULT_SETTINGS; }
}

function updateOverlay() {
  if (!overlay || overlay.isDestroyed()) return;
  const display = screen.getAllDisplays().find(({ id }) => id === settings.displayId) ?? screen.getPrimaryDisplay();
  overlay.setBounds(display.bounds);
  overlay.webContents.send("overlay:state", { text: overlayVisible ? subtitle : "", settings });
}

function createWindows() {
  const preload = join(__dirname, "preload.cjs");
  control = new BrowserWindow({
    width: 440, height: 780, minWidth: 400, minHeight: 600,
    title: "Screen OCR Translator Desktop",
    webPreferences: { preload, contextIsolation: true, nodeIntegration: false, sandbox: false },
  });
  control.loadURL("app://desktop/index.html");
  control.on("closed", () => app.quit());

  overlay = new BrowserWindow({
    x: 0, y: 0, width: 800, height: 600,
    frame: false, transparent: true, show: false, alwaysOnTop: true,
    focusable: false, skipTaskbar: true, hasShadow: false,
    webPreferences: { preload, contextIsolation: true, nodeIntegration: false, sandbox: false },
  });
  overlay.setAlwaysOnTop(true, "screen-saver");
  overlay.setIgnoreMouseEvents(true, { forward: true });
  if (process.platform === "win32") overlay.setContentProtection(true);
  overlay.loadURL("app://desktop/overlay.html");
  overlay.webContents.on("did-finish-load", () => { updateOverlay(); overlay.showInactive(); });
  screen.on("display-metrics-changed", updateOverlay);
  screen.on("display-added", updateOverlay);
  screen.on("display-removed", updateOverlay);
}

function validSender(event: Electron.IpcMainInvokeEvent) {
  if (event.sender !== control.webContents && event.sender !== overlay.webContents) throw new Error("Invalid window");
}

function registerIpc() {
  ipcMain.handle("settings:get", (event) => { validSender(event); return settings; });
  ipcMain.handle("settings:save", async (event, value: unknown) => {
    validSender(event);
    if (event.sender !== control.webContents) throw new Error("Control window required");
    settings = normalizeSettings(value);
    await writeFile(settingsFile(), JSON.stringify(settings, null, 2), { mode: 0o600 });
    updateOverlay();
    return settings;
  });
  ipcMain.handle("sources:list", async (event) => {
    validSender(event);
    const sources = await desktopCapturer.getSources({ types: ["window"], thumbnailSize: { width: 0, height: 0 } });
    return sources.filter((source) => !/screen ocr translator desktop/i.test(source.name))
      .map(({ id, name }) => ({ id, name }));
  });
  ipcMain.handle("displays:list", (event) => {
    validSender(event);
    return screen.getAllDisplays().map(({ id, label, bounds }) => ({
      id, label: label || `Display ${id} (${bounds.width}×${bounds.height})`,
    }));
  });
  ipcMain.handle("source:capture", async (event, sourceId: unknown) => {
    validSender(event);
    if (event.sender !== control.webContents || typeof sourceId !== "string") throw new Error("Invalid capture request");
    const sources = await desktopCapturer.getSources({ types: ["window"], thumbnailSize: { width: 1920, height: 1080 } });
    const source = sources.find(({ id }) => id === sourceId);
    if (!source) throw new Error("Selected window is unavailable. Refresh the window list.");
    if (source.name === "Screen OCR Translator Desktop") throw new Error("Select the Boosteroid window.");
    if (source.thumbnail.isEmpty()) throw new Error("The selected window produced an empty capture.");
    return source.thumbnail.toPNG();
  });
  ipcMain.handle("text:translate", async (event, text: unknown, context: unknown) => {
    validSender(event);
    if (event.sender !== control.webContents || typeof text !== "string" || text.length > 2000 || !Array.isArray(context)) throw new Error("Invalid translation request");
    const provider = settings.provider === "deepl"
      ? createDeepLTranslationProvider({ deepl: { apiKey: settings.deeplKey, plan: settings.deeplPlan } })
      : settings.provider === "openai"
        ? createOpenAiTranslationProvider({ llm: { baseUrl: settings.llmBaseUrl, apiKey: settings.llmKey, model: settings.llmModel } })
        : createGoogleTranslationProvider();
    return translateText({ text, sourceLang: "en", targetLang: "ar", context: (context as TranslationContextLine[]).slice(-3), translationProvider: provider });
  });
  ipcMain.handle("subtitle:set", (event, value: unknown) => {
    validSender(event);
    if (event.sender !== control.webContents) throw new Error("Control window required");
    subtitle = typeof value === "string" ? value.slice(0, 2000) : "";
    updateOverlay();
  });
}

function registerShortcuts() {
  const shortcuts: [string, string][] = [
    ["CommandOrControl+Alt+S", "toggle"],
    ["CommandOrControl+Alt+O", "overlay"],
    ["CommandOrControl+Alt+Up", "font-up"],
    ["CommandOrControl+Alt+Down", "font-down"],
  ];
  for (const [accelerator, command] of shortcuts) {
    globalShortcut.register(accelerator, () => {
      if (command === "overlay") { overlayVisible = !overlayVisible; updateOverlay(); }
      else control.webContents.send("shortcut", command);
    });
  }
}

app.whenReady().then(async () => {
  protocol.handle("app", (request) => {
    const url = new URL(request.url);
    if (url.hostname !== "desktop") return new Response("Not found", { status: 404 });
    const path = resolve(rendererRoot, `.${decodeURIComponent(url.pathname)}`);
    if (path !== rendererRoot && !path.startsWith(rendererRoot + sep)) return new Response("Forbidden", { status: 403 });
    return net.fetch(pathToFileURL(path).href);
  });
  await loadSettings();
  registerIpc();
  createWindows();
  registerShortcuts();
});

app.on("will-quit", () => globalShortcut.unregisterAll());
