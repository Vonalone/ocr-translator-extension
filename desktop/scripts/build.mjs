import { build } from "esbuild";
import { build as viteBuild } from "vite";
import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const desktopRoot = fileURLToPath(new URL("../", import.meta.url));
const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const i18nShim = fileURLToPath(new URL("../src/compat/i18n.ts", import.meta.url));
const headersShim = fileURLToPath(
  new URL("../src/compat/fetch-with-modified-headers.ts", import.meta.url),
);

const compatPlugin = {
  name: "desktop-provider-compat",
  setup(bundle) {
    bundle.onResolve({ filter: /shared\/i18n$/ }, () => ({ path: i18nShim }));
    bundle.onResolve({ filter: /shared\/fetch-with-modified-headers$/ }, () => ({
      path: headersShim,
    }));
  },
};

await Promise.all([
  build({
    entryPoints: [`${desktopRoot}/src/main.ts`],
    outfile: `${desktopRoot}/dist/main.cjs`,
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node22",
    external: ["electron"],
    plugins: [compatPlugin],
  }),
  build({
    entryPoints: [`${desktopRoot}/src/preload.ts`],
    outfile: `${desktopRoot}/dist/preload.cjs`,
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node22",
    external: ["electron"],
  }),
  viteBuild({ configFile: `${desktopRoot}/vite.config.ts` }),
]);

const renderer = `${desktopRoot}/dist/renderer`;
await mkdir(`${renderer}/assets/ocr`, { recursive: true });
await cp(
  `${projectRoot}/src/public/assets/ocr/ppocrv6-small`,
  `${renderer}/assets/ocr/ppocrv6-small`,
  { recursive: true },
);
await cp(
  `${projectRoot}/src/public/assets/layout-grouping`,
  `${renderer}/assets/layout-grouping`,
  { recursive: true },
);
await cp(`${projectRoot}/src/public/ort`, `${renderer}/ort`, { recursive: true });
console.log("Desktop application built in desktop/dist");
