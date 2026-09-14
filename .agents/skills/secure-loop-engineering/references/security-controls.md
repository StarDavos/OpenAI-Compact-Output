# Security Controls for Agent Loops

Apply defense in depth. Unattended repetition amplifies both productivity and mistakes.

## Trust boundaries

Treat the scheduler, orchestrator, builder, evaluator, repository, CI system, secrets store, and production environment as separate trust zones.

Do not give the builder authority over the controls that constrain the builder.

## Permission rules

Default to:

- read access to only required context
- write access only to an isolated branch/worktree/sandbox
- no direct write to protected branches
- no production credentials
- no permission-management rights
- no ability to change branch protection, security policy, evaluator policy, scheduler policy, or budget ceilings
- short-lived credentials where supported
- least-privilege service identities for automation

## Secret handling

Never persist credentials in state files, prompts, comments, PR descriptions, screenshots, or verbose logs.

Prefer secret references/handles over raw secret values. Redact outputs before persistence. Stop if the loop unexpectedly encounters credentials or private keys.

## Required security gates for code-changing loops

Select gates appropriate to the stack, prioritizing:

- secret scanning
- SAST
- dependency vulnerability audit
- lockfile integrity/reproducible dependency checks
- container/image scanning where containers are built
- IaC scanning when infrastructure code changes
- license/policy checks when required by the project

Do not let the builder bypass a failing gate by deleting, disabling, suppressing, or weakening the check unless a human explicitly approves the exact exception.

## Self-modification controls

Mark these files/areas forbidden to autonomous modification unless a human explicitly approves the exact change:

- loop contract security section
- budget ceilings
- evaluator instructions
- CI security gates
- branch protection configuration
- credential/secret policy
- audit logging
- allow/deny path lists
- deployment approval rules

An autonomous worker must never expand its own permissions, scope, budget, or authority.

## Risk classes

Use these defaults:

### Low

Formatting, docs, lint fixes, bounded dependency updates, test-only changes, deterministic refactors with strong coverage.

May be eligible for unattended PR creation after observed validation.

### Medium

Application logic changes, API behavior, data-processing code, non-sensitive configuration, UI behavior.

Require PR review and stronger integration/e2e gates.

### High

Authentication, authorization, cryptography, secrets, payments, production deployment, firewall/network policy, identity/tenant configuration, destructive data migrations, sensitive customer data, branch/security policy, or evaluator/budget controls.

Keep human-gated. Do not auto-merge. Prefer no production write access for the worker.

## Circuit breakers

Stop immediately on:

- forbidden-path modification
- attempt to disable a gate
- attempt to alter its own permissions/budget/evaluator
- secret leakage
- destructive command outside explicit scope
- repeated identical failure beyond threshold
- unexpected production endpoint or tenant access
- anomalous diff size or file count above contract limits
- inability to determine whether an action is reversible

Log the reason without logging secrets.

## Supply-chain controls

Pin or constrain dependencies where practical. Treat third-party skills, actions, packages, MCP servers, and plugins as code that can expand the trust boundary.

Review requested permissions, provenance, update policy, and data access before introducing them into an unattended loop.

## Logging and auditability

Record:

- run ID and timestamp
- trigger source
- task identity
- commit/worktree/branch
- gates executed and exit status
- evaluator verdict
- retry count
- escalation reason
- final disposition

Do not store chain-of-thought, credentials, or unnecessary sensitive payloads.
