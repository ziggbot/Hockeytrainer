// Builds the claude.ai preview as ONE self-contained HTML file:
//   npm run build:artifact            → dist-artifact/tranarappen.html
//   VITE_SHARE_BASE=<artifact url> npm run build:artifact   (share links point at the preview)
//
// The artifact host wraps the file in its own <html>/<head>/<body>, allows
// inline scripts and styles, and blocks other hosts — so JS, CSS and fonts
// are all inlined here.
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
execSync("npx vite build --mode artifact", { cwd: root, stdio: "inherit" });

const assets = join(root, "dist-artifact", "assets");
const files = readdirSync(assets);
const pick = (ext) => {
  const found = files.filter((f) => f.endsWith(ext));
  if (found.length !== 1) throw new Error(`expected one ${ext} bundle, found: ${found.join(", ") || "none"}`);
  return readFileSync(join(assets, found[0]), "utf8");
};

// Fonts are inlined as woff2 + woff; every browser that runs this app reads
// woff2, so drop the woff fallbacks to halve the size.
const css = pick(".css").replace(/,\s*url\(data:font\/woff;base64,[^)]*\) format\("woff"\)/g, "");
// "</script" inside the bundle would end the inline <script> early.
const js = pick(".js").replace(/<\/script/gi, "<\\/script");

const html = [
  "<title>Tränarappen</title>",
  '<meta name="theme-color" content="#eef2f6">',
  `<style>${css}</style>`,
  '<div id="root"></div>',
  `<script type="module">${js}</script>`,
  ""
].join("\n");

const out = join(root, "dist-artifact", "tranarappen.html");
writeFileSync(out, html);
console.log(`\n${out} (${(html.length / 1024).toFixed(0)} KB)`);
