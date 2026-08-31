# Cloudflare Worker Deployment Notes

Compact Code Viewer supports a stateless Cloudflare Worker deployment that connects directly to ChatGPT over HTTPS.

For step-by-step self-hosting instructions, including **Cloudflare Zero Trust Free**, Access, Managed OAuth, ChatGPT Dynamic Client Registration, and final validation, use [PUBLIC_RELEASE.md](PUBLIC_RELEASE.md).

## Architecture

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
  | shared validation + render_code logic
  | transient source string in request memory only
  v
MCP result + bundled widget resource
```

The Worker is not a proxy to the Docker application. Docker/Node and Cloudflare Worker are alternative transports over shared security-sensitive logic.

## Source lifecycle

```text
request arrives
  -> Cloudflare Access authorization
  -> authenticated identity backstop in Worker production mode
  -> authenticated-user rate limit
  -> bounded JSON body read
  -> strict render_code validation
  -> transient in-memory processing
  -> line/character metadata calculation
  -> MCP result + widget tool input
  -> request ends
```

Compact Code Viewer application code does not persist source to KV, D1, R2, Durable Objects, Queues, Analytics Engine, Cache API, files, databases, object storage, analytics services, paste services, AI APIs, or webhooks.

## Request limits

```text
render_code.code:          200,000 characters
complete MCP HTTP request: 1,048,576 bytes (1 MiB)
```

Unsupported sizes are rejected explicitly. Accepted source is not silently shortened.

## Deployment configuration split

### `wrangler.jsonc`

Local-only Worker development configuration:

- `workers_dev: false`;
- preview URLs disabled;
- no routes;
- no persistent storage bindings;
- no runtime secrets;
- loopback local development only.

### `wrangler.deploy.jsonc`

Bootstrap configuration used to create the Worker before a public URL is enabled:

- `workers_dev: false`;
- preview URLs disabled;
- no route/hostname exposure;
- no persistent storage binding;
- no runtime secret.

The intended sequence is to bootstrap first, attach Cloudflare Access to **all Worker traffic**, enable Managed OAuth, and only then use the production configuration.

### `wrangler.production.jsonc`

Hosted production template:

- `workers_dev: true`;
- preview URLs disabled;
- Cloudflare-native rate limiter;
- no KV/D1/R2/Durable Object/Queue/Analytics binding;
- no application runtime secret;
- Worker observability disabled;
- dependency instrumentation disabled;
- Wrangler metrics disabled.

The public template uses a generic rate-limit namespace ID. Operators must choose a positive namespace ID that does not collide with another rate-limit namespace in their own Cloudflare account.

## Access and OAuth

A production Worker should not be exposed as an anonymous MCP endpoint.

The validated hosted model is:

1. create the Worker with no public route;
2. attach Cloudflare Access to **All traffic** for that Worker;
3. define the intended Allow policy;
4. enable Managed OAuth;
5. configure the narrow ChatGPT callback allowlist required by the current ChatGPT client;
6. enable the production `workers.dev` hostname;
7. verify unauthenticated `/mcp` and `/healthz` requests return Access authentication failure before connecting ChatGPT.

The Worker also fails closed at the application layer in production when the rate-limit binding is present but authenticated Access identity is unavailable.

## Privacy of authenticated identity

Cloudflare Access necessarily receives the user's identity to perform authentication.

Compact Code Viewer uses the Access identity only for authenticated-user rate limiting. The identity email is normalized and SHA-256 hashed before being passed as the rate-limit key, so the raw email address is not used as the application's rate-limit binding key.

## Runtime credentials

Compact Code Viewer requires **zero application runtime secrets**.

It does not require:

- ChatGPT password;
- OpenAI API key;
- ChatGPT session cookie;
- MFA credential;
- GitHub personal access token;
- database/analytics credential;
- Cloudflare deployment token at runtime.

Wrangler OAuth or another deployment credential is a control-plane credential used by the operator to deploy the Worker. It is not included in Worker runtime configuration or source.

## Narrow runtime compatibility

Broad Node compatibility remains disabled:

```text
no_nodejs_compat
no_nodejs_compat_v2
```

The current Cloudflare MCP dependency stack requires AsyncLocalStorage, so only the narrow compatibility flag is enabled:

```text
nodejs_als
```

The application Worker itself imports no filesystem, subprocess, shell, VM, interpreter, or operating-system module.

## Local Worker testing

```bash
npm ci
npm audit --audit-level=high
npm run scan:secrets
npm run scan:public-release
npm run scan:worker-config
npm run scan:worker-production-config
npm run scan:dangerous
npm run typecheck
npm run lint
npm test
npm run build
npm run worker:dev
```

Local Worker endpoints:

```text
MCP:    http://127.0.0.1:8788/mcp
Health: http://127.0.0.1:8788/healthz
```

With the Worker running locally:

```bash
MCP_URL=http://127.0.0.1:8788/mcp npm run smoke:mcp
MCP_URL=http://127.0.0.1:8788/mcp npm run smoke:security
```

## Production bundle privacy check

Before public distribution or deployment:

```bash
npm run worker:dry-run:production
npm run scan:public-bundle
```

Wrangler creates the actual production bundle without deploying it. The audit then rejects generated files containing account-specific Worker hostnames, Access issuers, personal profile paths, email addresses, or credential-like patterns.

## Rollback

The Worker is stateless, so rollback does not require data migration:

1. disable the production Worker route if immediate containment is needed;
2. restore the last reviewed Worker version;
3. verify Access remains attached to all traffic;
4. verify unauthenticated `/mcp` and `/healthz` requests are rejected;
5. rerun MCP/security acceptance tests;
6. rotate deployment credentials only if compromise is suspected.

## Limits of the privacy claim

Application observability and application source logging are disabled, but that does not prove Cloudflare, OpenAI, the browser, operating system, or network provider retain zero operational metadata.

The application-level guarantee is intentionally narrower: Compact Code Viewer does not intentionally persist source content, log source content, execute source content, or send source content to an unrelated third-party application service.

## References

Cloudflare:

- https://developers.cloudflare.com/cloudflare-one/setup/
- https://developers.cloudflare.com/learning-paths/clientless-access/initial-setup/create-zero-trust-org/
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/managed-oauth/
- https://developers.cloudflare.com/workers/wrangler/configuration/
- https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- https://developers.cloudflare.com/workers/runtime-apis/nodejs/asynclocalstorage/

OpenAI:

- https://developers.openai.com/plugins/build/mcp-server
- https://developers.openai.com/plugins/build/chatgpt-ui
