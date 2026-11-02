import { createPaddleOcrProvider } from "../../src/providers/ocr/paddle";
import { LiveSession } from "../../src/entrypoints/content/live-session";
import { createFrameSignature, framesMatch, type FrameSignature } from "../../src/shared/frame-signature";
import type { DesktopSettings } from "./bridge";
import "./style.css";

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const status = byId<HTMLElement>("status");
const toggle = byId<HTMLButtonElement>("toggle");
const source = byId<HTMLSelectElement>("source");
const display = byId<HTMLSelectElement>("display");
const provider = byId<HTMLSelectElement>("provider");
const ocr = createPaddleOcrProvider({
  backend: "wasm",
  resolveUrl: (path: string) => new URL(path, location.href).href,
});
let settings: DesktopSettings;
let session: LiveSession | undefined;
let lastSignature: FrameSignature | undefined;
let lastText = "";
let lastSubtitle = "";

function setStatus(message: string) { status.textContent = message; }
function reportError(stage: string, error: unknown) {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  void window.desktop?.logError(stage, message).catch(() => {});
}
window.addEventListener("error", (event) => reportError("window", event.error ?? event.message));
window.addEventListener("unhandledrejection", (event) => reportError("promise", event.reason));
function showProviderOptions() {
  byId("deepl-options").style.display = provider.value === "deepl" ? "block" : "none";
  byId("llm-options").style.display = provider.value === "openai" ? "block" : "none";
}
function fillForm() {
  source.value = settings.sourceId;
  display.value = settings.displayId === null ? "primary" : String(settings.displayId);
  provider.value = settings.provider;
  for (const key of ["deeplKey", "deeplPlan", "llmBaseUrl", "llmKey", "llmModel"] as const) {
    (byId<HTMLInputElement | HTMLSelectElement>(key)).value = String(settings[key]);
  }
  for (const key of ["fontSize", "opacity", "bottom", "horizontal", "cropTop", "cropHeight", "cropWidth"] as const) {
    const value = key === "opacity" ? settings.opacity * 100 : settings[key];
    byId<HTMLInputElement>(key).value = String(value);
    byId<HTMLOutputElement>(`${key}Value`).value = `${Math.round(value)}${key === "fontSize" ? " px" : "%"}`;
  }
  showProviderOptions();
}
function readForm(): DesktopSettings {
  return {
    ...settings,
    sourceId: source.value,
    displayId: display.value === "primary" ? null : Number(display.value),
    provider: provider.value as DesktopSettings["provider"],
    deeplKey: byId<HTMLInputElement>("deeplKey").value,
    deeplPlan: byId<HTMLSelectElement>("deeplPlan").value as DesktopSettings["deeplPlan"],
    llmBaseUrl: byId<HTMLInputElement>("llmBaseUrl").value,
    llmKey: byId<HTMLInputElement>("llmKey").value,
    llmModel: byId<HTMLInputElement>("llmModel").value,
    fontSize: Number(byId<HTMLInputElement>("fontSize").value),
    opacity: Number(byId<HTMLInputElement>("opacity").value) / 100,
    bottom: Number(byId<HTMLInputElement>("bottom").value),
    horizontal: Number(byId<HTMLInputElement>("horizontal").value),
    cropTop: Number(byId<HTMLInputElement>("cropTop").value),
    cropHeight: Number(byId<HTMLInputElement>("cropHeight").value),
    cropWidth: Number(byId<HTMLInputElement>("cropWidth").value),
  };
}
let saveTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      settings = await window.desktop.saveSettings(readForm());
      fillForm();
      lastSignature = undefined;
      session?.regionChanged(1);
    } catch (error) {
      reportError("settings-save", error);
      setStatus(`Could not save settings: ${String(error)}`);
    }
  }, 250);
  for (const key of ["fontSize", "opacity", "bottom", "horizontal", "cropTop", "cropHeight", "cropWidth"]) {
    const input = byId<HTMLInputElement>(key);
    byId<HTMLOutputElement>(`${key}Value`).value = `${input.value}${key === "fontSize" ? " px" : "%"}`;
  }
  showProviderOptions();
}

async function refreshSources() {
  const sources = await window.desktop.listSources();
  source.replaceChildren();
  const matches = sources.filter(({ name }) => /boosteroid/i.test(name));
  const ordered = [...matches, ...sources.filter((entry) => !matches.includes(entry))];
  for (const entry of ordered) source.add(new Option(entry.name, entry.id));
  if (sources.some(({ id }) => id === settings.sourceId)) source.value = settings.sourceId;
  else if (matches[0]) { source.value = matches[0].id; settings.sourceId = source.value; scheduleSave(); }
  else if (sources[0]) { source.value = sources[0].id; settings.sourceId = source.value; scheduleSave(); }
  if (!sources.length) setStatus("No app windows found. Open Boosteroid and refresh.");
}

async function refreshDisplays() {
  const displays = await window.desktop.listDisplays();
  display.replaceChildren(new Option("Primary monitor", "primary"));
  for (const item of displays) display.add(new Option(item.label, String(item.id)));
  display.value = settings.displayId === null ? "primary" : String(settings.displayId);
}

async function readFrame(minLineThickness: number | undefined) {
  if (!source.value) return { status: "hidden" as const };
  const png = await window.desktop.capture(source.value).catch((error) => {
    reportError("capture", error);
    throw error;
  });
  const image = new Blob([new Uint8Array(png)], { type: "image/png" });
  const bitmap = await createImageBitmap(image).catch((error) => {
    reportError("image-decode", error);
    throw error;
  });
  try {
    const width = bitmap.width;
    const height = bitmap.height;
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(bitmap, 0, 0);
    const pixels = ctx.getImageData(0, 0, width, height);
    const signature = createFrameSignature(pixels);
    if (lastSignature && framesMatch(lastSignature, signature)) {
      return { status: "ok" as const, text: lastText, unchanged: true };
    }
    lastSignature = signature;
    const result = await ocr.recognize({ image, sourceLang: "en", grouping: "single", minLineThickness: minLineThickness === undefined ? undefined : minLineThickness * height }).catch((error) => {
      reportError("ocr", error);
      throw error;
    });
    lastText = result.text;
    const lineThickness = result.blocks?.reduce((max, block) => Math.max(max, block.oriented?.rect.height ?? block.bbox.height), 0);
    return { status: "ok" as const, text: result.text, unchanged: false, lineThickness: lineThickness ? lineThickness / height : undefined };
  } finally { bitmap.close(); }
}

function stop() {
  session?.stop();
  session = undefined;
  toggle.textContent = "Start live subtitles";
  setStatus("Stopped");
  lastSubtitle = "";
  byId("latest").textContent = "";
  void window.desktop.setSubtitle("");
}
function start() {
  if (!source.value) { setStatus("Select the Boosteroid window first."); return; }
  lastSignature = undefined;
  lastText = "";
  setStatus("Initializing OCR…");
  session = new LiveSession({
    readIntervalMs: 350,
    idleIntervalMs: 650,
    readFrame: (_requestId, minThickness) => readFrame(minThickness),
    translate: (_requestId, text, context) => window.desktop.translate(text, context),
    cancel: () => {},
    createId: () => crypto.randomUUID(),
    isVisible: () => true,
    now: () => Date.now(),
    onChange: (state) => {
      if (state.status === "error") reportError("live-session", state.error);
      setStatus(state.status === "error" ? `Error: ${state.error}` : state.status === "running" ? "Watching Boosteroid subtitles" : state.status);
      const next = state.status !== "error" && state.line?.state === "ready" ? state.line.translation ?? "" : "";
      if (next !== lastSubtitle) {
        lastSubtitle = next;
        byId("latest").textContent = next;
        void window.desktop.setSubtitle(next);
      }
    },
  });
  session.start();
  toggle.textContent = "Stop live subtitles";
}

async function init() {
  settings = await window.desktop.getSettings();
  await refreshSources();
  await refreshDisplays();
  fillForm();
  setStatus("Ready. Select the Boosteroid window and start.");
  byId("refresh").addEventListener("click", () => { void refreshSources(); });
  byId("openLogs").addEventListener("click", () => {
    void window.desktop.openLogs().then((path) => setStatus(`Log file: ${path}`)).catch((error) => {
      reportError("open-logs", error);
      setStatus(`Could not open logs: ${String(error)}`);
    });
  });
  toggle.addEventListener("click", () => session ? stop() : start());
  for (const element of document.querySelectorAll("input,select")) element.addEventListener("input", scheduleSave);
  window.desktop.onShortcut((command) => {
    if (command === "toggle") session ? stop() : start();
    if (command === "font-up" || command === "font-down") {
      const input = byId<HTMLInputElement>("fontSize");
      input.value = String(Math.max(16, Math.min(96, Number(input.value) + (command === "font-up" ? 2 : -2))));
      scheduleSave();
    }
  });
  if (ocr.preload) {
    void ocr.preload().then(() => {
      if (!session) setStatus("Ready. Select the Boosteroid window and start.");
    }).catch((error) => {
      reportError("ocr-initialization", error);
      setStatus(`OCR initialization failed: ${String(error)}`);
    });
  }
}
void init().catch((error) => {
  reportError("initialization", error);
  setStatus(`Error: ${String(error)}`);
});
