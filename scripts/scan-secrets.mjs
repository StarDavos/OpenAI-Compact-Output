import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([".git", "node_modules", "dist", "coverage", ".wrangler"]);
const ignoredDirectoryPrefixes = ["tunnel-client-"];
const forbiddenNames = [/^\.env(?:\.|$)/u, /^\.dev\.vars(?:\.|$)/u];
const patterns = [
  [/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/u, "OpenAI-style API key"],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}\b/u, "GitHub token"],
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u, "private key material"],
  [/\bCLOUDFLARE_API_TOKEN\s*=\s*[^\s#]+/u, "Cloudflare API token assignment"],
  [/\bCLOUDFLARE_ACCOUNT_ID\s*=\s*[^\s#]+/u, "Cloudflare account ID assignment"],
];

async function walk(relative = "") {
  const directory = path.join(ROOT, relative);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const ignoredByPrefix = ignoredDirectoryPrefixes.some((prefix) => entry.name.startsWith(prefix));
      if (ignoredDirectories.has(entry.name) || ignoredByPrefix) continue;
      files.push(...(await walk(path.join(relative, entry.name))));
      continue;
    }
    files.push(path.join(relative, entry.name));
  }

  return files;
}

const files = await walk();
const failures = [];

for (const relative of files) {
  const basename = path.basename(relative);
  if (forbiddenNames.some((pattern) => pattern.test(basename)) && basename !== ".env.example") {
    failures.push(`${relative}: secret-bearing local file must not be committed`);
    continue;
  }

  let text;
  try {
    text = await readFile(path.join(ROOT, relative), "utf8");
  } catch {
    continue;
  }

  for (const [pattern, label] of patterns) {
    if (pattern.test(text)) failures.push(`${relative}: possible ${label}`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}

console.log(`Secret scan PASS: ${files.length} repository files reviewed; no credential patterns or local secret files found`);
