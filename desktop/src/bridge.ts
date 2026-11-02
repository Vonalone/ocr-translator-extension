import type { LiveTranslationResponse } from "../../src/shared/messages";
import type { TranslationContextLine } from "../../src/shared/types";

export interface DesktopSettings {
  sourceId: string;
  provider: "google" | "deepl" | "openai";
  deeplKey: string;
  deeplPlan: "free" | "pro";
  llmBaseUrl: string;
  llmKey: string;
  llmModel: string;
  fontSize: number;
  opacity: number;
  bottom: number;
  horizontal: number;
  cropTop: number;
  cropHeight: number;
  cropWidth: number;
  displayId: number | null;
}

export interface DesktopBridge {
  getSettings(): Promise<DesktopSettings>;
  saveSettings(settings: DesktopSettings): Promise<DesktopSettings>;
  listSources(): Promise<{ id: string; name: string }[]>;
  listDisplays(): Promise<{ id: number; label: string }[]>;
  capture(sourceId: string): Promise<Uint8Array>;
  translate(text: string, context: TranslationContextLine[]): Promise<LiveTranslationResponse>;
  setSubtitle(text: string): Promise<void>;
  onShortcut(callback: (command: string) => void): () => void;
  onOverlay(callback: (state: { text: string; settings: DesktopSettings }) => void): () => void;
}

declare global {
  interface Window { desktop: DesktopBridge }
}
