import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./src/", import.meta.url));
const sharedSource = fileURLToPath(new URL("../src/", import.meta.url));
const i18nShim = fileURLToPath(new URL("./src/compat/i18n.ts", import.meta.url));
const headersShim = fileURLToPath(
  new URL("./src/compat/fetch-with-modified-headers.ts", import.meta.url),
);

export default defineConfig({
  root,
  base: "./",
  define: { "import.meta.env.BROWSER": JSON.stringify("chrome") },
  plugins: [
    {
      name: "desktop-provider-compat",
      enforce: "pre",
      resolveId(source) {
        if (source.startsWith("@/")) return `${sharedSource}${source.slice(2)}.ts`;
        if (/shared\/i18n$/.test(source)) return i18nShim;
        if (/shared\/fetch-with-modified-headers$/.test(source)) return headersShim;
        return undefined;
      },
    },
  ],
  build: {
    outDir: fileURLToPath(new URL("./dist/renderer/", import.meta.url)),
    emptyOutDir: true,
    target: "chrome132",
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL("./src/index.html", import.meta.url)),
        overlay: fileURLToPath(new URL("./src/overlay.html", import.meta.url)),
      },
    },
  },
});
