# Compact Code Viewer

Compact Code Viewer is a ChatGPT MCP App that renders complete generated code and other large copyable technical text inside compact, scrollable cards instead of letting giant code blocks dominate the conversation.

The renderer is intentionally narrow:

- submitted source is treated as untrusted inert text;
- submitted source is never executed;
- submitted source is not intentionally persisted or logged;
- accepted source is never silently truncated;
- each independently copyable unit should be rendered in its own card;
- heredoc/here-string wrappers stay intact as one atomic copy unit;
- Copy remains locked unless line/character integrity metadata matches.

## Deployment options

### Cloudflare Worker

Recommended for a stable ChatGPT connection without keeping a local PC, Docker container, or tunnel running.

```text
ChatGPT
  |
  | HTTPS + OAuth
  v
Cloudflare Access
  |
  v
Cloudflare Worker /mcp
  |
  v
Compact Code Viewer widget
```

Each user deploys the Worker into their **own Cloudflare account** and creates their **own Cloudflare Zero Trust organization, Access policy, Managed OAuth configuration, rate-limit namespace, and workers.dev hostname**.

No user needs credentials or identifiers belonging to the original developer.

See **[docs/PUBLIC_RELEASE.md](docs/PUBLIC_RELEASE.md)** for the complete self-hosted Cloudflare deployment guide, including Cloudflare Zero Trust Free onboarding and ChatGPT OAuth setup.

### Local Node / Docker

The original local path remains available for development and private testing:

```bash
docker compose up --build
```

Local endpoints:

```text
MCP:    http://127.0.0.1:8787/mcp
Health: http://127.0.0.1:8787/healthz
```

A localhost service is not directly reachable by ChatGPT without a separate secure connectivity mechanism.

## Requirements

- Node.js 22 or newer
- npm
- Docker only if using the local container path
- Cloudflare account + Zero Trust organization for hosted deployment
- ChatGPT custom app/plugin support for ChatGPT integration

## Validate before deployment

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
npm run worker:dry-run:production
npm run scan:public-bundle
```

Do not deploy if any audit, scan, build, or test fails.

## Application limits

```text
render_code code field: 200,000 characters
complete MCP HTTP body:  1,048,576 bytes (1 MiB)
```

Oversized input fails closed; it is never shortened to fit.

Passing stress fixtures include 10, 100, 700, and 1,500 lines.

## Cloudflare security model

The production Worker configuration is designed to use:

- Cloudflare Access in front of all Worker traffic;
- Managed OAuth for ChatGPT/non-browser MCP authentication;
- preview URLs disabled;
- Cloudflare-native rate limiting;
- no KV, D1, R2, Durable Objects, Queues, Analytics Engine, or application source-storage binding;
- no application runtime secret;
- Worker observability disabled;
- Wrangler usage metrics disabled;
- dependency instrumentation disabled;
- narrow `nodejs_als` compatibility only while broad Node compatibility remains disabled.

The production Worker fails closed if the expected authenticated Access identity is unavailable.

## Privacy statement

Compact Code Viewer does not intentionally persist source content, log source content, or send source content to an unrelated third-party service.

This is **not** a claim that Cloudflare, OpenAI, browsers, networks, or operating systems retain zero operational metadata. Users should review the privacy and retention policies of the platforms they use.

## Public-release hygiene

The public repository should be created from a reviewed current tree with **fresh Git history**. Do not simply flip the private development repository to public.

The release process intentionally rejects or excludes:

- account-specific `workers.dev` hostnames;
- account-specific Cloudflare Access issuers;
- Cloudflare account/token assignments;
- personal user-profile paths;
- non-noreply email addresses in release source;
- `.env*`, `.dev.vars*`, `.wrangler`, logs, caches, and local tunnel binaries;
- generated Worker bundles containing tenant identifiers or credential-like patterns.

Run:

```bash
npm run scan:public-release
npm run worker:dry-run:production
npm run scan:public-bundle
```

before publishing any release.

## Security and architecture documentation

- [Public/self-hosted Cloudflare setup](docs/PUBLIC_RELEASE.md)
- [Security architecture](docs/SECURITY_ARCHITECTURE.md)
- [Cloudflare implementation notes](docs/CLOUDFLARE_DEPLOYMENT.md)

## License

See [LICENSE](LICENSE).
