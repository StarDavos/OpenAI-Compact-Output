import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "web", "dist");

function escapeClosingTag(value, tag) {
  return value.replace(new RegExp(`</${tag}`, "gi"), `<\\/${tag}`);
}

const [javascript, css] = await Promise.all([
  readFile(path.join(DIST, "widget.js"), "utf8"),
  readFile(path.join(DIST, "widget.css"), "utf8"),
]);

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="referrer" content="no-referrer" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'" />
  <style>${escapeClosingTag(css, "style")}</style>
</head>
<body>
  <div id="root"></div>
  <script>${escapeClosingTag(javascript, "script")}</script>
</body>
</html>`;

await writeFile(path.join(DIST, "widget.html"), html, { encoding: "utf8", mode: 0o644 });
console.log(`Built web/dist/widget.html (${html.length} chars)`);
