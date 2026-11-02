# Screen OCR Translator Desktop

Windows desktop companion for the Chrome extension. It reuses the extension's PP-OCRv6 worker, Google/DeepL/LLM translation providers, and live subtitle session. The extension remains in `../src` and builds separately.

## Install on Windows

Download `Screen-OCR-Translator-Desktop-Setup-0.1.0.exe` from `release/` to your Windows laptop and run it. Keep the default install directory or choose another in the installer. The OCR models are bundled; translation needs network access for Google/DeepL or a reachable LLM endpoint. You do **not** need Chrome to run the desktop app.

On the server, copy the installer to your laptop with Git Bash (replace the server address if needed):

```bash
scp root@74.220.28.145:/root/Projects/ocr-translator-extension/source/desktop/release/Screen-OCR-Translator-Desktop-Setup-0.1.0.exe ~/Downloads/
```

Ensure `~/Downloads` has enough free space before copying. You can use another drive by first checking its Git Bash path (`ls /`), then selecting a directory on that drive.

## Use with Boosteroid

1. Open the Boosteroid Windows desktop app and start a game. For Red Dead Redemption 2, enable English subtitles in the game.
2. Open Screen OCR Translator Desktop. Select the Boosteroid window. Use **Refresh windows** if it is not listed.
3. Keep **Google** selected, or enter a DeepL API key or an OpenAI-compatible LLM endpoint and model.
4. Press **Start live subtitles**. The first OCR read loads the bundled models and may take several seconds. The latest Arabic line appears at the bottom center of the monitor, over the game.
5. Select the monitor displaying Boosteroid if it is not your primary monitor. Adjust the font, opacity, and vertical/horizontal position as needed.
6. If the app reads other game UI text, adjust **Capture region** so it covers just the English subtitle area. The default is the center 80% of the window, from 70% to 95% of its height.

The overlay is transparent, click-through, and always on top. The app captures the selected game **window**, rather than the whole display, so the overlay is absent from OCR frames. Windows display capture protection is also enabled for the overlay. Identical captured regions skip OCR; the live session avoids translating the same recognized subtitle repeatedly. Only the latest ready Arabic translation is shown.

### Shortcuts

| Shortcut | Action |
| --- | --- |
| Ctrl+Alt+S | Start or stop live subtitles |
| Ctrl+Alt+O | Hide or show the overlay |
| Ctrl+Alt+Up / Down | Increase or decrease font size |

Font size, opacity, subtitle position, monitor, capture region, source window, and translation provider are saved automatically. The primary monitor is used by default. Global shortcuts may be unavailable if another app has already registered them.

## Build and test from source

Use Node.js 22 or later:

```bash
cd desktop
npm ci
npm run typecheck
npm test
npm run build
npm start
```

For a Windows NSIS installer, run `npm run dist:win` on Windows. On Linux, use a Wine-enabled electron-builder environment (for example, the `electronuserland/builder:wine` Docker image) and run `npx electron-builder --win nsis --x64 --publish never` after `npm run build`. The installer is written to `desktop/release/`.

### Manual test on Windows

Open Boosteroid with a game showing English subtitles. Start live subtitles; check that Arabic text appears and changes as the English subtitle changes, with no history or background. Move the mouse and click through the Arabic overlay. Change each overlay slider and verify the visible result. Pause the game on one subtitle and check that translation does not repeat. Toggle the overlay and stop/start with the shortcuts. Switch Google to DeepL or your LLM endpoint and confirm the selected provider works. Close and reopen the desktop app and check saved settings. Also load the existing Chrome extension separately to verify it still works.

Window capture can be blank if Boosteroid uses protected video output or if Windows denies capture. Try Boosteroid's windowed or borderless mode in that case. This Linux build environment cannot perform the Windows game runtime test.
