import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSettingsRepository,
  defaultSettings,
  getDefaultOverlayMode,
  getDisplayMode,
  getAdjustSelection,
  getGamingSubtitleSettings,
  defaultGamingSubtitleSettings,
  getUiLocale,
  setUiLocale,
  UI_LOCALES,
  setDisplayMode,
  setDefaultOverlayMode,
  setGamingSubtitleSettings,
} from "./storage";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubStorage(values: Record<string, unknown>): void {
  vi.stubGlobal("browser", {
    storage: {
      local: {
        get: vi.fn(async () => values),
      },
    },
  });
}

describe("storage defaults", () => {
  it.each([undefined, null, "auto", "unsupported", {}, 42])(
    "uses the browser locale for %j",
    async (uiLocale) => {
      stubStorage({ uiLocale });
      await expect(getUiLocale()).resolves.toBe("auto");
    },
  );

  it.each(UI_LOCALES)("reads the %s UI locale", async (uiLocale) => {
    stubStorage({ uiLocale });
    await expect(getUiLocale()).resolves.toBe(uiLocale);
  });

  it("writes only the UI locale key", async () => {
    const set = vi.fn(async () => {});
    vi.stubGlobal("browser", { storage: { local: { set } } });
    await setUiLocale("ja");
    expect(set).toHaveBeenCalledWith({ uiLocale: "ja" });
  });

  it("uses the browser locale when storage cannot be read", async () => {
    vi.stubGlobal("browser", {
      storage: { local: { get: vi.fn().mockRejectedValue(new Error("Unavailable")) } },
    });
    await expect(getUiLocale()).resolves.toBe("auto");
  });

  it("uses overlay when no display mode is saved", async () => {
    stubStorage({});
    await expect(getDisplayMode()).resolves.toBe("overlay");
  });

  it("keeps the normal live panel by default", async () => {
    stubStorage({});
    await expect(getGamingSubtitleSettings()).resolves.toEqual(defaultGamingSubtitleSettings);
  });

  it("bounds saved subtitle controls before applying them to the page", async () => {
    stubStorage({ gamingSubtitles: { enabled: true, fontSize: 1000, bottom: -5, opacity: 0 } });
    await expect(getGamingSubtitleSettings()).resolves.toMatchObject({
      enabled: true, fontSize: 64, bottom: 0, opacity: 0.2,
    });
  });

  it("saves the gaming subtitle preferences", async () => {
    const set = vi.fn(async () => {});
    vi.stubGlobal("browser", { storage: { local: { set } } });
    const settings = { enabled: true, fontSize: 36, bottom: 12, opacity: 0.75 };
    await setGamingSubtitleSettings(settings);
    expect(set).toHaveBeenCalledWith({ gamingSubtitles: settings });
  });

  it.each(["panel", "overlay"] as const)(
    "saves %s as the display mode",
    async (mode) => {
      const set = vi.fn(async () => {});
      vi.stubGlobal("browser", { storage: { local: { set } } });

      await setDisplayMode(mode);

      expect(set).toHaveBeenCalledWith({ displayMode: mode });
    },
  );

  it("shows translations in new overlays by default", async () => {
    stubStorage({});
    await expect(getDefaultOverlayMode()).resolves.toBe("translation");
  });

  it.each(["translation", "original"] as const)(
    "saves %s as the default overlay content",
    async (mode) => {
      const set = vi.fn(async () => {});
      vi.stubGlobal("browser", { storage: { local: { set } } });

      await setDefaultOverlayMode(mode);

      expect(set).toHaveBeenCalledWith({ defaultOverlayMode: mode });
    },
  );

  it("skips the adjustment step by default", async () => {
    stubStorage({});
    await expect(getAdjustSelection()).resolves.toBe(false);
  });

  it("reads the adjustment setting", async () => {
    stubStorage({ adjustSelection: true });
    await expect(getAdjustSelection()).resolves.toBe(true);
  });

  it.each([
    [false, true],
    [true, false],
  ])(
    "migrates startOcrImmediately=%j to adjustSelection=%j",
    async (startOcrImmediately, adjustSelection) => {
      stubStorage({ startOcrImmediately });
      await expect(getAdjustSelection()).resolves.toBe(adjustSelection);
    },
  );

  it("prefers the adjustment setting over the legacy one", async () => {
    stubStorage({ adjustSelection: false, startOcrImmediately: false });
    await expect(getAdjustSelection()).resolves.toBe(false);
  });

  it("uses default settings when none are saved", async () => {
    stubStorage({});
    await expect(createSettingsRepository().get()).resolves.toEqual(
      defaultSettings,
    );
  });
});
