import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await readFile(path.join(ROOT, "wrangler.production.jsonc"), "utf8"));

const failures = [];

if (config.name !== "compact-code-viewer") failures.push("unexpected Worker name");
if (config.workers_dev !== true) failures.push("production workers_dev must be enabled");
if (config.preview_urls !== false) failures.push("production preview URLs must remain disabled");
if (config.send_metrics !== false) failures.push("send_metrics must remain disabled");
if (config.observability?.enabled !== false) failures.push("Worker observability must remain disabled");
if (config.dependencies_instrumentation?.enabled !== false) failures.push("dependency instrumentation must remain disabled");

for (const key of [
  "account_id",
  "routes",
  "route",
  "vars",
  "kv_namespaces",
  "d1_databases",
  "r2_buckets",
  "durable_objects",
  "queues",
  "analytics_engine_datasets",
  "services",
  "hyperdrive",
  "mtls_certificates",
  "dispatch_namespaces",
  "tail_consumers",
  "workflows",
  "ai",
  "vectorize",
  "browser",
  "images",
]) {
  if (Object.hasOwn(config, key)) failures.push(`production config must not define ${key}`);
}

const flags = new Set(config.compatibility_flags ?? []);
for (const required of ["no_nodejs_compat", "no_nodejs_compat_v2", "nodejs_als"]) {
  if (!flags.has(required)) failures.push(`required compatibility flag missing: ${required}`);
}
for (const forbidden of [
  "nodejs_compat",
  "nodejs_compat_v2",
  "python_workers",
  "enable_nodejs_child_process_module",
  "enable_nodejs_vm_module",
  "enable_nodejs_fs_module",
]) {
  if (flags.has(forbidden)) failures.push(`forbidden compatibility flag present: ${forbidden}`);
}

const rateLimits = config.ratelimits;
if (!Array.isArray(rateLimits) || rateLimits.length !== 1) {
  failures.push("exactly one production rate-limit binding is required");
} else {
  const binding = rateLimits[0];
  if (binding.name !== "MCP_RATE_LIMITER") failures.push("unexpected rate-limit binding name");
  if (!/^\d+$/.test(String(binding.namespace_id ?? "")) || Number(binding.namespace_id) <= 0) {
    failures.push("rate-limit namespace_id must be a positive integer string");
  }
  if (binding.simple?.limit !== 180) failures.push("production rate limit must remain 180 requests per minute");
  if (binding.simple?.period !== 60) failures.push("production rate-limit period must remain 60 seconds");
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}

console.log("Production Worker config PASS: workers.dev enabled, previews disabled, no storage/secrets/routes, 180 req/min authenticated-user limiter configured");
