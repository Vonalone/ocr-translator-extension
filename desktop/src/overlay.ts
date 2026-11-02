import type { DesktopSettings } from "./bridge";

const element = document.getElementById("subtitle")!;
function show(text: string, settings: DesktopSettings) {
  element.textContent = text;
  element.style.fontSize = `${settings.fontSize}px`;
  element.style.opacity = String(settings.opacity);
  element.style.bottom = `${settings.bottom}%`;
  element.style.left = `${settings.horizontal}%`;
}
window.desktop.onOverlay(({ text, settings }) => show(text, settings));
window.desktop.getSettings().then((settings) => show("", settings));
