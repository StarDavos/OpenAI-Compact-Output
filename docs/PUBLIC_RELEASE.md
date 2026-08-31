# Public Release and Self-Hosted Cloudflare Guide

This guide is for people who want to deploy their own copy of Compact Code Viewer into their own Cloudflare account and connect it to ChatGPT.

The intended public distribution model is:

```text
public source/template
        |
        v
user's own Cloudflare account
        |
        +-- user's Worker
        +-- user's Zero Trust organization
        +-- user's Access policy
        +-- user's Managed OAuth configuration
        +-- user's rate-limit namespace
        |
        v
user's ChatGPT connection
```

No public user should need or receive the original developer's Cloudflare account ID, email address, Access tenant, Worker hostname, OAuth token, API token, session cookie, policy ID, application ID, or deployment credentials.

## Important release rule

Do not make the private development repository public in place. Public releases should be created from a reviewed, sanitized tree in a new public repository with fresh history. This prevents private development history, commit metadata, temporary deployment details, deleted files, or prior operational notes from becoming public accidentally.

## Requirements

- Node.js 22 or newer.
- npm.
- A Cloudflare account.
- Wrangler authentication to the user's own Cloudflare account.
- A Cloudflare Zero Trust organization.
- ChatGPT with custom app/plugin support.

## 1. Create a Cloudflare account and Zero Trust organization

Cloudflare Access requires a Zero Trust organization.

1. Create or sign in to a Cloudflare account.
2. Enable two-factor authentication on the Cloudflare account.
3. In the Cloudflare dashboard, select **Zero Trust**.
4. Choose a unique team name for the Zero Trust organization.
5. Select the **Zero Trust Free** plan unless a paid plan is intentionally required.
6. Complete Cloudflare's onboarding. Cloudflare currently requires payment details during Zero Trust onboarding even for the Free plan; choosing the Free plan should not create a subscription charge by itself.
7. Confirm the Zero Trust dashboard loads before continuing.

Official Cloudflare references:

- https://developers.cloudflare.com/cloudflare-one/setup/
- https://developers.cloudflare.com/learning-paths/clientless-access/initial-setup/create-zero-trust-org/

## 2. Clone and validate the project

```bash
git clone <PUBLIC_REPOSITORY_URL>
cd <PUBLIC_REPOSITORY_DIRECTORY>
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
```

Do not deploy if any security/privacy scan or test fails.

## 3. Authenticate Wrangler

```bash
npx wrangler login
npx wrangler whoami
```

Wrangler should show the user's own Cloudflare account. Never paste Wrangler OAuth credentials, API tokens, cookies, MFA codes, or recovery codes into issues, chat messages, or repository files.

## 4. Bootstrap the Worker without a public URL

The bootstrap configuration creates the Worker service with `workers_dev` and preview URLs disabled.

```bash
npm run worker:deploy:bootstrap
```

After this command, verify in Cloudflare that the Worker exists and shows no enabled URL.

## 5. Protect the Worker with Cloudflare Access

In the Cloudflare dashboard:

1. Open **Workers & Pages** and select `compact-code-viewer`.
2. Open **Access** / **Manage Worker access**.
3. Select **All traffic** so production and preview routes are protected by the Access application.
4. Create an Allow policy for the identities that should be permitted to use this Worker.
5. Save the Access application.

For a personal deployment, the narrowest simple policy is normally the user's own identity/account membership. For a shared deployment, define the intended user group explicitly instead of using a broad public allow rule.

## 6. Enable Managed OAuth

ChatGPT is a non-browser MCP client and needs an OAuth-capable Access flow.

In Cloudflare:

1. Go to **Zero Trust > Access controls > Applications**.
2. Edit the Compact Code Viewer application.
3. Open **Additional/Advanced settings > OAuth**.
4. Enable **Managed OAuth**.
5. Keep localhost and loopback redirect allowances disabled for a hosted ChatGPT connection unless a separate local client specifically requires them.
6. Use short-lived access tokens. Cloudflare currently recommends short access-token lifetimes for this type of client.
7. Save.

For ChatGPT Dynamic Client Registration, allow the ChatGPT connector callback path required by the current ChatGPT client. During V1 validation, the following narrow hosted callback pattern was required:

```text
https://chatgpt.com/connector/oauth/*
```

If ChatGPT uses a different callback pattern in a future release, use the exact callback family documented or presented by the current ChatGPT client rather than widening the allowlist unnecessarily.

Managed OAuth references:

- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/managed-oauth/
- https://developers.cloudflare.com/changelog/post/2026-03-20-managed-oauth/

## 7. Review the production rate-limit namespace

`wrangler.production.jsonc` ships with a generic positive namespace ID for the rate-limit binding. Cloudflare requires the namespace ID to be unique for rate-limit bindings within the user's account.

If `1001` is already used by another rate-limit binding in the user's account, replace it with another positive integer before deploying.

The application does not use the rate-limit key to store source code. The production Worker rate-limits by authenticated Access identity.

## 8. Run the final local security gate

```bash
npm audit --audit-level=high
npm run scan:secrets
npm run scan:public-release
npm run scan:worker-production-config
npm run scan:dangerous
npm run typecheck
npm run lint
npm test
npm run build
```

All commands must pass.

## 9. Deploy the protected production Worker

Only after Access and Managed OAuth are configured:

```bash
npm run worker:deploy:production
```

The resulting URL will be under the user's own Cloudflare Workers subdomain, for example:

```text
https://compact-code-viewer.<YOUR_WORKERS_SUBDOMAIN>.workers.dev
```

Preview URLs remain disabled by the project configuration.

## 10. Verify the security boundary before ChatGPT

Without an OAuth token, `/mcp` and `/healthz` should be rejected by Cloudflare Access.

Example:

```bash
curl -i https://compact-code-viewer.<YOUR_WORKERS_SUBDOMAIN>.workers.dev/mcp
curl -i https://compact-code-viewer.<YOUR_WORKERS_SUBDOMAIN>.workers.dev/healthz
curl -i https://compact-code-viewer.<YOUR_WORKERS_SUBDOMAIN>.workers.dev/.well-known/oauth-authorization-server
```

Expected behavior:

- `/mcp`: `401 Unauthorized` without a valid Access token.
- `/healthz`: `401 Unauthorized` without a valid Access token.
- OAuth authorization-server discovery: JSON describing the user's own Cloudflare Access issuer and endpoints.

Do not continue if the MCP endpoint is anonymously callable.

## 11. Connect ChatGPT

Create a custom ChatGPT app/plugin using:

```text
https://compact-code-viewer.<YOUR_WORKERS_SUBDOMAIN>.workers.dev/mcp
```

Authentication: **OAuth**.

Registration: **Dynamic Client Registration (DCR)** when supported.

Complete the Cloudflare Access authorization flow in the browser. The user should authenticate to their own Zero Trust organization, not to any developer-owned account.

## 12. Acceptance test

Ask ChatGPT to produce multiple independent copy/paste units, such as two separate file-creation heredocs followed by a separate command block.

Expected behavior:

- each independent copy unit receives its own Compact Code card;
- a heredoc wrapper is never split from its contents or closing delimiter;
- Copy copies only that card's complete source;
- no truncation or placeholder ellipses;
- Full View works;
- no integrity warning appears for a complete payload.

## Privacy and data-flow statement

Compact Code Viewer intentionally has no application source-storage feature. Submitted source is processed transiently to validate and render the response. The Worker configuration contains no KV, D1, R2, Durable Object, Queue, Analytics Engine, or application observability binding for source content.

This is not a promise that Cloudflare, OpenAI, browsers, operating systems, or networks retain zero operational metadata. Public documentation should state the narrower enforceable guarantee: Compact Code Viewer does not intentionally persist source content, log source content, or send source content to an unrelated third-party service.

## Public-repository hygiene

Before publishing a release:

- run `npm run scan:public-release`;
- run `npm run scan:secrets`;
- do not include `.git` history copied from the private development repository;
- do not include `.wrangler`, `.env*`, `.dev.vars*`, logs, coverage output, build caches, or local tunnel binaries;
- do not include account-specific Worker hostnames or Cloudflare Access issuers;
- do not include user-profile paths;
- do not include deployment credentials or account IDs;
- create the public repository from a sanitized current tree with a fresh initial commit.
