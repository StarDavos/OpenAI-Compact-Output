import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUNDLE_ROOT = path.join(ROOT, ".public-release-build");
const findings = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(target)));
    else files.push(target);
  }
  return files;
}

let files;
try {
  files = await walk(BUNDLE_ROOT);
} catch {
  console.error("FAIL: .public-release-build does not exist; run the production Wrangler dry-run first");
  process.exit(1);
}

if (files.length === 0) {
  console.error("FAIL: production Wrangler dry-run produced no files");
  process.exit(1);
}

for (const absolute of files) {
  const relative = path.relative(ROOT, absolute).replaceAll("\\", "/");
  let text;
  try {
    text = await readFile(absolute, "utf8");
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
    if (pattern.test(text)) findings.push(`${relative}: possible ${label}`);
  }

  const emails = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu) ?? [];
  for (const email of emails) findings.push(`${relative}: email address present (${email})`);
}

if (findings.length > 0) {
  for (const finding of findings) console.error(`FAIL: ${finding}`);
  process.exit(1);
}

console.log(`Public Worker bundle privacy audit PASS: ${files.length} generated deployment files reviewed; no tenant hostname, Access issuer, profile path, email, or credential pattern found`);
