import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await readFile(path.join(ROOT, "wrangler.jsonc"), "utf8"));

const failures = [];
const forbiddenTopLevelKeys = [
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
];

for (const key of forbiddenTopLevelKeys) {
  if (Object.hasOwn(config, key)) failures.push(`wrangler.jsonc must not define ${key}`);
}

if (config.workers_dev !== false) failures.push("workers_dev must remain false on the preparation branch");
if (config.preview_urls !== false) failures.push("preview_urls must remain false on the preparation branch");
if (config.send_metrics !== false) failures.push("send_metrics must remain false");
if (config.observability?.enabled !== false) failures.push("Worker observability must remain disabled");
if (config.dependencies_instrumentation?.enabled !== false) failures.push("dependency instrumentation must remain disabled");
if (config.dev?.ip !== "127.0.0.1") failures.push("local Worker dev server must bind to 127.0.0.1");
if (config.dev?.local_protocol !== "http") failures.push("local Worker dev server should remain local HTTP");

const flags = new Set(config.compatibility_flags ?? []);
for (const required of ["no_nodejs_compat", "no_nodejs_compat_v2", "nodejs_als"]) {
  if (!flags.has(required)) failures.push(`required compatibility flag missing: ${required}`);
}
for (const forbidden of ["nodejs_compat", "nodejs_compat_v2", "python_workers", "enable_nodejs_child_process_module", "enable_nodejs_vm_module", "enable_nodejs_fs_module"]) {
  if (flags.has(forbidden)) failures.push(`forbidden broad/execution compatibility flag present: ${forbidden}`);
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}

console.log("Worker config boundary PASS: local-only, zero bindings/secrets/routes, full Node compatibility disabled, AsyncLocalStorage only");
