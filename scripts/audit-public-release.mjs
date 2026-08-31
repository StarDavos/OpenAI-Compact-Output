import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const ignoredDirectories = new Set([
  ".git",
  "node_modules",
  "dist",
  "coverage",
  ".wrangler",
  "web/dist",
]);

const forbiddenPathFragments = [
  "tunnel-client-",
  ".dev.vars",
  ".env.",
  ".wrangler",
];

const allowedEmailPatterns = [
  /^[0-9]+\+[A-Za-z0-9_.-]+@users\.noreply\.github\.com$/u,
];

const findings = [];

async function walk(relative = "") {
  const absolute = path.join(ROOT, relative);
  const entries = await readdir(absolute, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name) || ignoredDirectories.has(child.replaceAll("\\", "/"))) continue;
      files.push(...(await walk(child)));
      continue;
    }
    files.push(child);
  }

  return files;
}

const files = await walk();

for (const relative of files) {
  const normalized = relative.replaceAll("\\", "/");

  for (const fragment of forbiddenPathFragments) {
    if (normalized.includes(fragment) && normalized !== ".env.example") {
      findings.push(`${normalized}: release must not contain local/deployment artifact path '${fragment}'`);
    }
  }

  let text;
  try {
    text = await readFile(path.join(ROOT, relative), "utf8");
  } catch {
    continue;
  }

  const checks = [
    [/\b[A-Za-z0-9.-]+\.workers\.dev\b/gu, "account-specific workers.dev hostname"],
    [/\b[A-Za-z0-9.-]+\.cloudflareaccess\.com\b/gu, "account-specific Cloudflare Access issuer"],
    [/\bC:\\Users\\[^\\\r\n]+/gu, "Windows user profile path"],
    [/\/Users\/[^/\r\n]+/gu, "macOS user profile path"],
    [/\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,})\b/gu, "credential-like token"],
    [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/gu, "private key material"],
    [/\bCLOUDFLARE_(?:API_TOKEN|ACCOUNT_ID)\s*=\s*[^\s#]+/gu, "Cloudflare credential/account assignment"],
  ];

  for (const [pattern, label] of checks) {
    if (pattern.test(text)) findings.push(`${normalized}: possible ${label}`);
  }

  const emails = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu) ?? [];
  for (const email of emails) {
    if (!allowedEmailPatterns.some((pattern) => pattern.test(email))) {
      findings.push(`${normalized}: email address present (${email})`);
    }
  }
}

if (findings.length > 0) {
  for (const finding of findings) console.error(`FAIL: ${finding}`);
  process.exit(1);
}

console.log(`Public release privacy audit PASS: ${files.length} tracked-source candidates reviewed; no tenant hostname, Access issuer, personal path, non-noreply email, or credential pattern found`);
