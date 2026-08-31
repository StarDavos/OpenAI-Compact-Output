# Deployment Provenance

Compact Code Viewer should make it possible to answer a simple release question:

> Which reviewed Git commit is serving this ChatGPT connection right now?

The production Cloudflare Worker uses Cloudflare's read-only Version Metadata binding (`CF_VERSION_METADATA`) to expose the active Worker version ID, optional version tag, and version timestamp through the authenticated `/healthz` endpoint.

This adds no source storage, telemetry, analytics, application secret, or outbound request.

## 1. Validate the release candidate

From a clean checkout of the public release repository:

```bash
npm ci
npm audit --audit-level=high
npm run scan:secrets
npm run scan:public-release
npm run scan:worker-production-config
npm run scan:dangerous
npm run typecheck
npm run lint
npm test
npm run build
npm run worker:dry-run:production
npm run scan:public-bundle
```

Do not deploy if any command fails.

## 2. Record the Git commit

Get the exact commit you are about to deploy:

```bash
git rev-parse HEAD
```

Keep that value as the release tag. A short SHA is convenient for display, but the full commit SHA gives the strongest direct mapping back to GitHub.

## 3. Deploy with the Git commit as the Worker version tag

Replace `<GIT_COMMIT_SHA>` with the commit from the previous step:

```bash
npm run worker:deploy:production -- --tag <GIT_COMMIT_SHA> --message "Compact Code Viewer Git <GIT_COMMIT_SHA>"
```

Wrangler's `--tag` and `--message` options attach release metadata to the Cloudflare Worker version. The production Worker can then read that tag through `CF_VERSION_METADATA`.

Do not put credentials, account IDs, email addresses, tokens, or other sensitive data in the tag or message.

## 4. Verify the live authenticated health response

The production `/healthz` route remains protected by Cloudflare Access. After authenticating through the normal Access flow, inspect:

```text
https://compact-code-viewer.<YOUR_WORKERS_SUBDOMAIN>.workers.dev/healthz
```

Expected shape:

```json
{
  "ok": true,
  "service": "compact-code-viewer",
  "version": "0.1.0",
  "runtime": "cloudflare-worker",
  "workerVersion": {
    "id": "<CLOUDFLARE_VERSION_ID>",
    "tag": "<GIT_COMMIT_SHA>",
    "timestamp": "<CLOUDFLARE_VERSION_TIMESTAMP>"
  }
}
```

Acceptance criteria:

- `runtime` is `cloudflare-worker`;
- `workerVersion.id` is present;
- `workerVersion.tag` exactly matches the Git commit intentionally deployed;
- the corresponding GitHub commit passed the release CI/security gates;
- unauthenticated `/healthz` and `/mcp` remain rejected by Cloudflare Access.

If `workerVersion` is `null`, the Worker is running without the production Version Metadata binding and deployment provenance is not verified.

If the tag is missing or does not match the expected Git commit, do not claim the live deployment is the reviewed release candidate.

## 5. Record rollback information

The Cloudflare version ID in `/healthz` is useful for incident response and rollback identification. Record the version ID and matching Git commit in the release notes or operator change record.

Do not add source code, user content, access identities, or secrets to release records.

## Security boundary

Version metadata is control-plane release metadata. Compact Code Viewer uses it only to identify the running Worker version. It is not used to store or transmit submitted source code.

The existing privacy model remains unchanged: source is handled transiently, no application source-storage binding is added, Worker observability remains disabled, and the application does not intentionally log source content.
