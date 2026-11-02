import type { DesktopSettings } from "./bridge";

export const DEFAULT_SETTINGS: DesktopSettings = {
  sourceId: "",
  provider: "google",
  deeplKey: "",
  deeplPlan: "free",
  llmBaseUrl: "",
  llmKey: "",
  llmModel: "",
  fontSize: 38,
  opacity: 1,
  bottom: 8,
  horizontal: 50,
  cropTop: 70,
  cropHeight: 25,
  cropWidth: 80,
  displayId: null,
};

const clamp = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value)) : fallback;
const shortString = (value: unknown) => typeof value === "string" ? value.slice(0, 2048) : "";

export function normalizeSettings(input: unknown): DesktopSettings {
  const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
  return {
    sourceId: shortString(value.sourceId),
    provider: value.provider === "deepl" || value.provider === "openai" ? value.provider : "google",
    deeplKey: shortString(value.deeplKey),
    deeplPlan: value.deeplPlan === "pro" ? "pro" : "free",
    llmBaseUrl: shortString(value.llmBaseUrl),
    llmKey: shortString(value.llmKey),
    llmModel: shortString(value.llmModel),
    fontSize: clamp(value.fontSize, 16, 96, DEFAULT_SETTINGS.fontSize),
    opacity: clamp(value.opacity, 0.1, 1, DEFAULT_SETTINGS.opacity),
    bottom: clamp(value.bottom, 0, 45, DEFAULT_SETTINGS.bottom),
    horizontal: clamp(value.horizontal, 5, 95, DEFAULT_SETTINGS.horizontal),
    cropTop: clamp(value.cropTop, 0, 90, DEFAULT_SETTINGS.cropTop),
    cropHeight: clamp(value.cropHeight, 5, 100, DEFAULT_SETTINGS.cropHeight),
    cropWidth: clamp(value.cropWidth, 20, 100, DEFAULT_SETTINGS.cropWidth),
    displayId: typeof value.displayId === "number" && Number.isInteger(value.displayId) ? value.displayId : null,
  };
}
