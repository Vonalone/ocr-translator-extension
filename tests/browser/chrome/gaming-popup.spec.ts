import { chromium, expect, test } from "@playwright/test";
import { resolve } from "node:path";

declare const chrome: typeof import("wxt/browser").browser;

test("Gaming Subtitle Mode saves Arabic and restores the normal target", async () => {
  const extensionPath = resolve(".output/chrome-mv3");
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  const context = await chromium.launchPersistentContext("", {
    ...(executablePath ? { executablePath } : { channel: "chromium" }),
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  try {
    const worker = context.serviceWorkers()[0] ??
      (await context.waitForEvent("serviceworker"));
    const extensionId = new URL(worker.url()).host;
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);

    const layout = await popup.evaluate(() => {
      const box = (selector: string) =>
        document.querySelector(selector)!.getBoundingClientRect();
      return {
        languageBottom: box("#target-language").bottom,
        displayBottom: box(".display-mode-field").bottom,
        gamingTop: box(".gaming-mode-field").top,
      };
    });
    expect(layout.gamingTop).toBeGreaterThan(layout.languageBottom);
    expect(layout.gamingTop).toBeGreaterThanOrEqual(layout.displayBottom);

    await popup.getByRole("radio", { name: "Gaming subtitle mode" }).check();
    await expect(popup.locator("#target-language")).toHaveValue("ar");
    await expect(popup.locator("#target-language")).toBeDisabled();
    await popup.locator("#gaming-font-size").evaluate((element: HTMLInputElement) => {
      element.value = "40";
      element.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await expect.poll(async () => popup.evaluate(async () => {
      const values = await chrome.storage.local.get(["settings", "gamingSubtitles"]);
      const settings = values.settings as { translation?: { targetLang?: string } } | undefined;
      const gaming = values.gamingSubtitles as { enabled?: boolean; fontSize?: number } | undefined;
      return {
        target: settings?.translation?.targetLang,
        enabled: gaming?.enabled,
        fontSize: gaming?.fontSize,
      };
    })).toEqual({ target: "ar", enabled: true, fontSize: 40 });

    await popup.getByRole("radio", { name: "Normal mode" }).check();
    await expect(popup.locator("#target-language")).toHaveValue("en");
    await expect(popup.locator("#target-language")).toBeEnabled();
    await expect.poll(async () => popup.evaluate(async () => {
      const values = await chrome.storage.local.get(["settings", "gamingSubtitles"]);
      const settings = values.settings as { translation?: { targetLang?: string } } | undefined;
      const gaming = values.gamingSubtitles as { enabled?: boolean } | undefined;
      return { target: settings?.translation?.targetLang, enabled: gaming?.enabled };
    })).toEqual({ target: "en", enabled: false });
  } finally {
    await context.close();
  }
});
