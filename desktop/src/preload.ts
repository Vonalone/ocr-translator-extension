import { contextBridge, ipcRenderer } from "electron";
import type { DesktopBridge } from "./bridge";

const bridge: DesktopBridge = {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),
  listSources: () => ipcRenderer.invoke("sources:list"),
  listDisplays: () => ipcRenderer.invoke("displays:list"),
  capture: (sourceId) => ipcRenderer.invoke("source:capture", sourceId),
  translate: (text, context) => ipcRenderer.invoke("text:translate", text, context),
  setSubtitle: (text) => ipcRenderer.invoke("subtitle:set", text),
  logError: (stage, message) => ipcRenderer.invoke("diagnostics:error", stage, message),
  openLogs: () => ipcRenderer.invoke("diagnostics:open"),
  onShortcut(callback) {
    const listener = (_event: Electron.IpcRendererEvent, command: string) => callback(command);
    ipcRenderer.on("shortcut", listener);
    return () => ipcRenderer.removeListener("shortcut", listener);
  },
  onOverlay(callback) {
    const listener = (_event: Electron.IpcRendererEvent, state: Parameters<typeof callback>[0]) => callback(state);
    ipcRenderer.on("overlay:state", listener);
    return () => ipcRenderer.removeListener("overlay:state", listener);
  },
};
contextBridge.exposeInMainWorld("desktop", bridge);
