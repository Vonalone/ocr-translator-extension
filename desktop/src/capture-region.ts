import type { DesktopSettings } from "./bridge";

/** Calculate the configured subtitle strip within a captured window image. */
export function captureRegion(
  width: number,
  height: number,
  settings: Pick<DesktopSettings, "cropTop" | "cropHeight" | "cropWidth">,
) {
  const cropWidth = Math.max(1, Math.round(width * settings.cropWidth / 100));
  const cropHeight = Math.max(1, Math.round(height * Math.min(settings.cropHeight, 100 - settings.cropTop) / 100));
  const y = Math.min(height - 1, Math.round(height * settings.cropTop / 100));
  return {
    x: Math.round((width - cropWidth) / 2),
    y,
    width: cropWidth,
    height: Math.min(cropHeight, height - y),
  };
}
