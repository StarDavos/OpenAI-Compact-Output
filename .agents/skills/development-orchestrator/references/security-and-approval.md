# Security and Approval Gates

Apply these gates whenever a development task touches production, external systems, sensitive data, credentials, dependencies, or irreversible actions.

## Risk classes

### R0 - Local and reversible

Examples: reading code, static analysis, local mockups, unit tests, local formatting.

Proceed normally. Still protect secrets and unrelated user work.

### R1 - Controlled mutation

Examples: editing repository files, changing local configuration, creating branches, running migrations against disposable/local data, writing test fixtures.

Proceed when within the user's request. Verify the diff and tests. Preserve rollback paths.

### R2 - External or shared mutation

Examples: opening a pull request, modifying shared issue metadata, changing a staging service, sending a message, editing a shared document, publishing a package pre-release.

Confirm that the action is within the user's explicit request. Show or summarize the consequential payload when useful. Verify the result after mutation.

### R3 - Production, destructive, financial, identity, or sensitive-data impact

Examples: production deployment, deleting resources/data, rotating credentials, changing auth/permissions, billing/purchases, customer-data export, sending external communications that commit the user, making irreversible infrastructure changes.

Require explicit authorization for the exact action unless it is already unmistakably contained in the user's request. Prefer a plan/diff/preview first. Use least privilege and a rollback or recovery plan. Verify after execution.

## Secrets and sensitive data

- Never ask the user to paste a secret if a secure connector, environment variable, secret store, device-code flow, or delegated authorization can avoid it.
- Never commit tokens, API keys, cookies, private keys, connection strings, passwords, or session artifacts.
- Redact logs, screenshots, traces, HAR files, crash dumps, environment output, and support bundles before sharing them.
- Minimize customer/user data copied into debugging or test contexts.
- Use synthetic data when it answers the same question.

## Dependency and supply-chain checks

Before adding a new dependency, action, package, skill, CLI, container image, or external script:

1. Confirm it is necessary.
2. Prefer the official package/source.
3. Inspect maintenance/release recency and ownership when practical.
4. Check license compatibility for redistributed software.
5. Pin or constrain versions when reproducibility/security warrants it.
6. Avoid install commands that pipe remote content directly into a shell unless the user explicitly accepts that tradeoff and the source is trusted.
7. Review generated lockfile and transitive changes for unexpected scope.

Third-party agent skills are instructions with authority over an agent. Treat them like dependencies: inspect them before trusting them.

## Web/browser safety

- Use authorized accounts and environments only.
- Prefer staging/test tenants for destructive or high-volume UI automation.
- Do not bypass MFA, CAPTCHA, access controls, or consent boundaries.
- Do not submit purchases, publish content, send messages, create accounts, or change security settings unless the user authorized that exact class of action.
- Re-read the resulting state after every consequential submit.

## MCP and tool servers

- Use least-privilege scopes and separate read/write authority when practical.
- Validate all inputs server-side; do not rely on the model to sanitize them.
- Bound file paths, URLs, commands, queries, and tenant/resource identifiers.
- Protect against SSRF, command injection, path traversal, SQL/NoSQL injection, unsafe deserialization, and confused-deputy behavior where applicable.
- Make destructive or high-impact tools require explicit confirmation/context.
- Keep audit logs for consequential actions without logging secrets.
- Design timeouts, retries, rate limits, and idempotency intentionally.
- Do not expose a raw shell or unrestricted generic HTTP client when a narrower tool can accomplish the workflow.

## Code changes

Before completion, inspect for:

- Hardcoded secrets or temporary credentials.
- Debug endpoints/logging left enabled.
- Authorization checks accidentally removed or broadened.
- Input validation weakened.
- TLS/certificate verification disabled.
- Unsafe CORS or wildcard permissions.
- New public network exposure.
- Dependency or container changes unrelated to the task.
- Test-only bypasses leaking into production paths.
- Sensitive data newly stored or logged.

## Recovery thinking

For changes with real blast radius, answer before execution:

- What is the rollback?
- What state could be partially applied?
- How will we detect failure?
- What backup/snapshot/version exists?
- What permissions can be narrowed?
- Which step should remain human-approved?
