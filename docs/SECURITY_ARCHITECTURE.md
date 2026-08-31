# Security Architecture

## Security objective

Compact Code Viewer is a renderer only. Submitted source is hostile untrusted data and must remain data from receipt through display/copy.

Security failures default to rejection. The application must not introduce source execution, source persistence, source logging, source-bearing egress to unrelated services, hidden runtime credentials, or silent truncation.

## Recommended hosted topology

```text
ChatGPT
  |
  | HTTPS + OAuth
  v
Cloudflare Access / Managed OAuth
  |
  v
Cloudflare Worker /mcp
  |
  | strict validation + transient source handling
  v
MCP result + bundled widget resource
  |
  v
ChatGPT widget host
```

Each deployment belongs to the operator's own Cloudflare account. The public distribution contains no developer-owned Cloudflare tenant identifier, Worker hostname, Access issuer, API token, account ID, policy ID, application ID, or runtime secret.

## Assets

### Submitted source

Submitted source may contain proprietary code, accidental secrets, prompt injection, hostile HTML/JavaScript, shell commands, malformed Unicode, control characters, very long lines, or intentionally adversarial payloads.

Goals:

- preserve accepted source exactly;
- never execute it;
- never intentionally persist it;
- never intentionally log it;
- never send it to an unrelated third party;
- reject unsupported sizes without truncation.

### Application source

Includes shared validation/render logic, Worker and Node transports, widget source, tests, build tooling, and deployment configuration.

Goals: keep runtime behavior narrow, prevent execution primitives, prevent account-specific values from entering distributable source, and keep deployment configuration reviewable.

### Deployment credentials

Cloudflare deployment credentials are operator/control-plane secrets, not application data.

They must never be committed, included in the generated Worker bundle, passed to `render_code`, logged, or bound into the Worker runtime.

## Trust boundaries

### ChatGPT / OpenAI

ChatGPT creates MCP requests, but tool arguments remain untrusted. Server-side validation is mandatory. Compact Code Viewer does not require the user's ChatGPT password, session cookie, MFA code, or OpenAI API key.

### Cloudflare Access

The hosted deployment is expected to place Cloudflare Access in front of **all Worker traffic** before the `workers.dev` production URL is enabled.

Managed OAuth converts Access into an OAuth-capable authorization layer for non-browser clients such as ChatGPT. Access policy determines who may reach the Worker.

The production Worker also uses Cloudflare's authenticated Access execution context as an application-level backstop whenever the production rate-limit binding is present. Missing Access context or identity fails closed.

### Cloudflare Worker

The Worker receives bounded MCP traffic, validates `render_code`, computes integrity metadata, and returns MCP result/resource data. Accepted source exists transiently in request memory.

The Worker has no source-storage binding and no application runtime secret. Full Node compatibility remains disabled. The narrow `nodejs_als` compatibility flag is enabled only because the current Cloudflare MCP/Agents dependency stack requires AsyncLocalStorage.

### Widget / browser host

The widget receives source as a string. Submitted source is not injected through `dangerouslySetInnerHTML` and is never evaluated as program code.

Copy uses the original accepted string and remains disabled until final line/character counts match server metadata.

## Application-enforced controls

### No arbitrary source execution

Runtime code is prohibited from using:

- `eval`;
- `Function` / `new Function`;
- child processes;
- `exec`, `execFile`, `spawn`, `fork`;
- Node `vm`;
- runtime dynamic imports;
- shell/interpreter execution;
- runtime compilation of submitted source;
- filesystem/container/sandbox execution of submitted source.

ESLint plus repository static scans enforce these restrictions.

### No application source persistence

The Worker production configuration defines no KV, D1, R2, Durable Objects, Queues, Analytics Engine, application database, object store, or source cache.

### No application source logging

The Worker application emits no application console logs containing source. Runtime smoke tests send source sentinels and fail if they appear in captured output.

The Node/Docker alternative logs only limited service lifecycle and metadata counts, not source bodies.

### No application runtime credentials

Serving `render_code` requires no OpenAI API key, ChatGPT credential, GitHub credential, database credential, analytics credential, or Cloudflare deployment token.

### Fail-closed size limits

```text
render_code source:         200,000 characters
complete MCP request body:  1,048,576 bytes (1 MiB)
```

Oversized input is rejected explicitly rather than truncated.

### Strict MCP surface

Only `render_code` is registered. It is read-only, non-destructive, closed-world, and idempotent. Input validation is strict and rejects unknown arguments.

### Minimal egress

Worker application code makes no direct outbound global `fetch()` call. Widget CSP allows no external connection domains. No analytics, telemetry, AI, paste, webhook, or storage service receives source from Compact Code Viewer application code.

### Authenticated rate limiting without raw identity keys

The production configuration uses Cloudflare's native rate-limit binding.

The Worker reads the authenticated Access identity, normalizes the identity email, hashes it with SHA-256, and sends only the derived hash as the rate-limit key. The raw email address is not used as the rate-limit key.

Cloudflare Access itself necessarily knows the authenticated identity because it performs authentication; the hashing step prevents Compact Code Viewer from unnecessarily forwarding the raw email into its own rate-limit binding key.

### Production health endpoint

When the production rate-limit binding is present, both `/mcp` and `/healthz` require authenticated Access context at the application layer. Cloudflare Access remains the primary edge control.

Local workerd development intentionally omits the production rate-limit binding so local health/smoke testing remains possible without a Cloudflare account.

## Browser/rendering controls

The widget loads no remote highlighter or source-bearing remote asset. MCP widget metadata declares empty connection/resource domain allowlists.

HTTP/widget responses use restrictive cache, referrer, content-type, frame, and permissions controls. Submitted source is not part of trusted HTML template generation.

## DoS/resource controls

Application limits are intentionally conservative relative to platform maximums. The Worker reads request bodies incrementally and rejects after the 1 MiB ceiling rather than intentionally buffering an unbounded body.

Cloudflare-native authenticated-user rate limiting defaults to 180 requests per 60 seconds in the public production template. Operators may choose a lower limit after testing their own usage pattern.

## Public-release privacy controls

The release process includes two independent privacy scans:

1. `npm run scan:public-release` scans the distributable source tree for tenant-specific Worker hostnames, Access issuers, personal profile paths, non-noreply email addresses, credential-like tokens, local secret files, and local tunnel artifacts.
2. `npm run worker:dry-run:production` followed by `npm run scan:public-bundle` builds the actual Wrangler production bundle without deploying it and scans the generated deployment files for tenant identifiers, email addresses, user paths, and credential-like material.

A public repository should be created from the sanitized current tree with **fresh Git history**. The private development repository must not simply be made public because development history and commit metadata can reveal information that is not present in the final tree.

## CI security gates

CI fails on:

- High/Critical npm audit findings;
- unexpected patched-dependency regressions;
- committed local secret files or credential-like patterns;
- public-release privacy findings;
- generated Worker bundle privacy findings;
- unsafe Wrangler configuration or persistent source-storage bindings;
- forbidden runtime execution APIs;
- broad Node compatibility;
- Worker OS/runtime imports;
- Worker `process.env` usage;
- Worker application console logging;
- Worker direct outbound global `fetch()`;
- type/lint/test/build failures;
- adversarial/source-integrity failures;
- hardened Docker regressions;
- local Worker MCP/security failures;
- source sentinels appearing in captured logs.

CI repository permission is read-only and contains no production deployment secret requirement.

## Provider-level metadata and limits of the guarantee

This project does **not** claim that Cloudflare, OpenAI, a browser, an operating system, or a network provider retains zero metadata.

Examples of provider-controlled metadata can include authentication identity, request timing, source/destination network metadata, account/tenant metadata, and platform security logs.

The enforceable application guarantee is narrower:

> Compact Code Viewer does not intentionally persist source content, log source content, execute source content, or send source content to an unrelated third-party application service.

Operators should review Cloudflare and OpenAI privacy/retention documentation for their own deployment requirements.

## Residual risks

1. Third-party dependency/supply-chain changes require ongoing audit.
2. ChatGPT app routing, clipboard behavior, iframe isolation, and fullscreen behavior are partly host-controlled.
3. Worst-case 200,000-character syntax highlighting can be expensive in a browser/widget host.
4. Unicode payloads can hit the byte body ceiling before the character ceiling.
5. `nodejs_als` remains a narrow compatibility exception required by the current Cloudflare dependency stack and should be reevaluated after dependency upgrades.
6. Access policy mistakes are operator configuration risks; users must verify unauthenticated `/mcp` and `/healthz` requests are rejected before connecting ChatGPT.
7. A public GitHub repository necessarily exposes its repository owner/organization identity and public commit authorship. That is branding/public metadata, not a hidden runtime credential.

## Deployment guide

See [PUBLIC_RELEASE.md](PUBLIC_RELEASE.md) for the privacy-safe self-hosted deployment procedure, including Cloudflare Zero Trust Free onboarding, Access, Managed OAuth, rate limiting, and ChatGPT connection testing.
