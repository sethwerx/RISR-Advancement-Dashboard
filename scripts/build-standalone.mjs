import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const outDir = path.join(root, "dist");
mkdirSync(outDir, { recursive: true });

const bundlePath = path.join(outDir, "advancement-office.js");
await build({
  absWorkingDir: root,
  entryPoints: ["standalone/main.tsx"],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  jsx: "automatic",
  outfile: bundlePath,
  minify: true,
  legalComments: "none",
  define: { "process.env.NODE_ENV": '"production"' },
  alias: { "@": path.join(root, "src") },
});

function dataUri(file, mime) {
  const bytes = readFileSync(file);
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

function face(family, weight, file) {
  return `@font-face{font-family:${JSON.stringify(family)};src:url(${dataUri(file, "font/woff2")}) format("woff2");font-weight:${weight};font-style:normal;font-display:swap;}`;
}

const fonts = [
  face("Bebas Neue", 400, "node_modules/@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff2"),
  face("Oswald", 400, "node_modules/@fontsource/oswald/files/oswald-latin-400-normal.woff2"),
  face("Oswald", 500, "node_modules/@fontsource/oswald/files/oswald-latin-500-normal.woff2"),
  face("Oswald", 600, "node_modules/@fontsource/oswald/files/oswald-latin-600-normal.woff2"),
  face("Carlito", 400, "node_modules/@fontsource/carlito/files/carlito-latin-400-normal.woff2"),
  face("Carlito", 700, "node_modules/@fontsource/carlito/files/carlito-latin-700-normal.woff2"),
].join("");

const css = fonts + readFileSync(path.join(root, "standalone/app.css"), "utf8");
const js = readFileSync(bundlePath, "utf8");
const white = dataUri("public/brand/logo-white.png", "image/png");
const navy = dataUri("public/brand/logo-navy.png", "image/png");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Advancement Office</title>
<style>${css}</style>
</head>
<body>
<!-- Edit this block. The client ID is public. Do not put secrets here. -->
<script id="advancement-config">
window.ADVANCEMENT_OFFICE_CONFIG = {
  googleClientId: "",
  masterSheetId: "",
  calendarId: "c_ga82ohfe30hhckqp10n1ipvktc@group.calendar.google.com",
  allowedDomain: "risr.ac.th",
  organizerEmail: "admissions@risr.ac.th"
};
window.__BRAND = { white: ${JSON.stringify(white)}, navy: ${JSON.stringify(navy)} };
</script>
<div id="root"></div>
<script>${js}</script>
</body>
</html>
`;

const htmlPath = path.join(outDir, "advancement-office.html");
writeFileSync(htmlPath, html);
rmSync(bundlePath, { force: true });
console.log(`Wrote ${htmlPath} (${Math.round(html.length / 1024)} KB)`);
