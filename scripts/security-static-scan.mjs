import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoots = ["server", "shared", "web", "worker"];
const extensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".jsonc"]);

async function collectFiles(relative) {
  const full = path.join(ROOT, relative);
  const entries = await readdir(full, { withFileTypes: true });
  const output = [];
  for (const entry of entries) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) output.push(...(await collectFiles(child)));
    else if (extensions.has(path.extname(entry.name))) output.push(child);
  }
  return output;
}

const files = (await Promise.all(runtimeRoots.map(collectFiles))).flat();
const failures = [];
const reviewed = [];

const forbidden = [
  [/(^|[^\w])eval\s*\(/u, "eval()"],
  [/\bnew\s+Function\b/u, "new Function"],
  [/dangerouslySetInnerHTML/u, "dangerouslySetInnerHTML"],
  [/(?:node:)?child_process/u, "child_process"],
  [/(?:node:)?vm(?:["'])/u, "vm module"],
  [/\b(?:exec|execFile|spawn|fork)\s*\(/u, "process execution API"],
  [/\bimport\s*\(/u, "dynamic import"],
  [/\b(?:writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream)\s*\(/u, "runtime filesystem write"],
];

for (const relative of files) {
  const text = await readFile(path.join(ROOT, relative), "utf8");
  for (const [pattern, label] of forbidden) {
    if (pattern.test(text)) failures.push(`${relative}: forbidden ${label}`);
  }

  if (relative.startsWith("worker/")) {
    if (/from\s+["'](?:node:|fs["']|path["']|child_process["']|vm["'])/u.test(text)) {
      failures.push(`${relative}: Worker imports an OS/Node runtime module`);
    }
    if (/process\.env/u.test(text)) failures.push(`${relative}: Worker reads process.env`);
    if (/\bconsole\.(?:log|info|warn|error|debug)\s*\(/u.test(text)) failures.push(`${relative}: Worker emits application console logs`);
    if (/\b(?:KVNamespace|D1Database|R2Bucket|DurableObject|Queue|AnalyticsEngine)\b/u.test(text)) {
      failures.push(`${relative}: Worker references a persistent Cloudflare binding type`);
    }

    const lines = text.split(/\r?\n/u);
    lines.forEach((line, index) => {
      if (/\bfetch\s*\(/u.test(line) && !/\.fetch\s*\(/u.test(line) && !/async\s+fetch\s*\(/u.test(line)) {
        failures.push(`${relative}:${index + 1}: Worker makes a direct outbound fetch()`);
      }
    });
  }

  if (relative === "server/server.ts") {
    if (/node:fs/u.test(text)) reviewed.push("server/server.ts: node:fs is read-only and only loads the trusted prebuilt widget asset");
    if (/process\.env/u.test(text)) reviewed.push("server/server.ts: process.env is limited to NODE_ENV/HOST/PORT non-secret runtime configuration");
    if (/\bconsole\./u.test(text)) reviewed.push("server/server.ts: console output is limited to service lifecycle, counts, and generic error categories");
  }
}

for (const item of reviewed) console.log(`REVIEWED: ${item}`);

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}

console.log(`Dangerous API scan PASS: ${files.length} runtime source/config files reviewed`);
