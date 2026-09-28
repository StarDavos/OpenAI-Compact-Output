# AI Skill Routing

Skill set revision: 2026-09-27.

This file maps the installed StarDavos custom Skills to this repository. Project-specific policy, security boundaries, and source-of-truth files always override generic Skill guidance. A Skill may reduce repetitive reasoning; it never grants additional authority.

## Current 2026 operating baseline

- Prefer deterministic tests, parsers, schema validators, and policy gates before model judgment.
- For agent frameworks, distinguish manager/agent-as-tool delegation from handoffs. Put load-bearing authorization and safety checks at the action boundary; do not assume first-input/final-output guardrails cover delegated tools.
- For new MCP work, use the newest protocol version the project's SDK fully supports. MCP 2026-07-28 is stateless at the protocol core; do not design new systems around retired session IDs or the old initialize handshake.
- Treat reusable Skills as behavioral supply-chain dependencies. Review bundled scripts/assets and re-verify when a Skill update changes tools, permissions, external calls, or approval rules.
- Use SLSA 1.2 concepts for build/source provenance when appropriate. Generate provenance/attestations only when useful, and verify them before trusting or deploying artifacts.
- For GitHub Actions, prefer least-privilege tokens, short-lived OIDC cloud credentials, full-SHA pinning for third-party Actions when practical, and verified artifact attestations for meaningful releases.
- Trace agents/tools/gates when useful, but keep prompts, system instructions, retrieval text, tool arguments/results, secrets, and PII out of default telemetry.

## Global routing rules

- `development-orchestrator`: coordinate non-trivial product/software work and choose the smallest reliable route.
- `development-guardrails`: apply to substantial development, architecture, deployment, auth/data, AI/agent, CI/CD, dependency, or infrastructure work.
- `developmentsecurity`: QUICK for ordinary security-sensitive changes; FULL for releases, auth/tenant boundaries, execution/sandbox changes, privileged agents, major dependency/runtime changes, or systemic findings.
- `secure-loop-engineering`: only for genuinely recurring/unattended loops; require contracts, budgets, stop conditions, independent verification, and human gates for high-impact actions.
- `agent-orchestration`: use for persistent state, multiple workers, recurring work selection, verifier/retry design, and human-reviewed self-improvement.
- `agent-orchestration-engine`: use when work benefits from a dependency graph, isolated work units, parallel lanes, unit-level correction loops, and deterministic merges.
- `evidence-graph-orchestrator`: use for provenance-preserving research, claims, entities, contradictions, timelines, relationship graphs, and source-backed synthesis.
- `seeing-the-veil`: use only as a separate inference/human-layer analysis over established evidence. Never convert inference, motive, proximity, or incentive into a verified fact without new evidence.

## Repository-specific stack

Primary:
1. `development-orchestrator` for MCP/ChatGPT integration and UI behavior.
2. `development-guardrails` + `developmentsecurity` for OAuth, Cloudflare, MCP transport, untrusted source rendering, clipboard permissions, deployment provenance, and public release review.
3. `agent-orchestration-engine` only for bounded development/eval decomposition.

Submitted source remains inert and must never be executed. Verify the real hosted artifact/revision, not only the local build.

## Adoption rule

If an installed Skill is unavailable in a runtime, follow the same project-local rules manually rather than dropping the gate. When a current/latest claim matters, verify the authoritative upstream source before changing architecture or policy.
