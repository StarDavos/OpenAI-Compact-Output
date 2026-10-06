---
name: development-orchestrator
description: Coordinate non-trivial development work by routing it through discovery, clarification, prototyping, design, diagnosis, build, browser QA, MCP or tool integration, or skill authoring, with verification and security approval gates. Use when a software task spans multiple steps, tools, systems, or uncertain implementation routes and needs a disciplined workflow from request to verified result.
---

# Development Orchestrator

## Core directive

Start from the workflow and desired outcome, not from a favorite model, framework, tool, or skill. Reduce manual steps between request and verified result without increasing authority beyond what the task requires.

Use the lightest process that can reliably produce evidence. Do not turn a two-line fix into a ceremony. Do not treat a risky production change like a toy prototype.

## Orchestration loop

1. Frame the outcome.
   - State or infer the user-visible result.
   - Identify acceptance criteria that can be verified.
   - Ask a question only when a missing decision materially changes the implementation, risk, or cost.
2. Inspect the available evidence.
   - Read the repository, files, logs, screenshots, docs, issue context, or existing behavior before inventing assumptions.
   - Prefer primary sources over recollection.
3. Choose a primary route from `references/routes.md`.
   - Add at most one secondary route at a time unless the task genuinely requires a sequence.
4. Execute the smallest reversible step that reduces uncertainty or moves the task forward.
5. Verify with observable evidence.
   - Run tests, reproduce behavior, inspect rendered output, compare before/after, or confirm the external action actually persisted.
6. Iterate from failures.
   - Treat failed verification as new evidence, not as permission to hand-wave success.
7. Handoff cleanly.
   - Summarize what changed, what proved it, remaining risk, and the next decision if one remains.

## Ceremony budget

Classify the task before choosing process depth:

- **Tiny**: obvious change, low risk, one file or one command. Execute directly and verify once.
- **Bounded**: several files or decisions, but a clear end state. Give a short plan, execute, test, and report.
- **Exploratory**: the user is unsure what behavior or design should be. Prototype before over-interviewing.
- **Diagnostic**: a known symptom exists but the cause is unknown. Build a failing feedback loop before theorizing.
- **Architectural or cross-system**: multiple components, external tools, permissions, or irreversible effects. Use explicit acceptance criteria, staged execution, security gates, and review.

## Routing rules

Read `references/routes.md` when the request is non-trivial. The main routes are:

- **Discover**: search for an existing skill, library, or tool before rebuilding commodity capability.
- **Clarify**: interview when a decision cannot be cheaply inferred or tested.
- **Prototype**: build disposable behavior or UI variants when seeing or using something will answer the question faster than discussion.
- **Design**: use deliberate visual direction; use an existing screenshot or generated reference as the visual source when visual fidelity matters.
- **Browser QA**: navigate and inspect an authorized web application using snapshot -> act -> re-snapshot -> verify.
- **Diagnose**: reproduce the exact failure before forming a root-cause theory; then rank hypotheses, instrument, fix, and add regression coverage.
- **Build**: implement a defined change in small reviewable slices; use isolated parallel workers only when the environment actually supports them and tasks are independent.
- **MCP / tool integration**: expose narrow, typed, least-privilege tools around real user workflows.
- **Skill authoring**: create a reusable skill when the value is repeatable procedure, domain knowledge, or tool guidance rather than one-off code.

When a more specific installed skill directly matches the chosen route, prefer invoking that skill if the runtime supports skill composition; keep this skill as the coordinator across phases. Do not pretend that a route or tool exists. If a specialized skill, browser, subagent system, image generator, or connector is unavailable, use the closest supported workflow and say what changed.

## Decision rules that prevent wasted work

### Ask versus prototype

Ask when the answer is policy, ownership, budget, irreversible scope, or a preference only the user can decide.

Prototype when the answer is experiential: interaction feel, layout, state transitions, information density, or whether a workflow is understandable. Keep prototypes disposable. Do not harden them with production dependencies until the direction is chosen.

### Diagnose versus guess

For a hard bug, do not lead with a theory. First establish one repeatable command or sequence that demonstrates the reported failure. If that is impossible, state why and identify the missing signal. Never claim a root cause from code reading alone when the behavior can be reproduced.

Before sharing logs, HAR files, traces, screenshots, environment dumps, or crash artifacts, remove secrets, cookies, tokens, credentials, customer data, and unrelated personal information.

### Visual design versus direct coding

When visual quality is central, use a visual reference first. If the user supplied a screenshot or mockup, inspect it and extract layout, hierarchy, typography, spacing, interaction, and component behavior before coding. If no reference exists and image generation is available, generate focused references before implementing. Direct coding is fine for mostly technical or structural UI work.

### Parallelism versus coordination overhead

Parallelize only independent tasks with explicit inputs, outputs, and ownership. Give each worker the minimum context it needs. Review task-level results before integration, then perform a whole-change review. If the environment has no subagent capability, execute the same task plan sequentially rather than simulating workers in prose.

## Security and approval gate

Read `references/security-and-approval.md` before any production change, external side effect, credential use, customer-data access, permission change, deployment, billing action, destructive command, or tool/server integration. If a dedicated security-review skill is installed, prefer that more specific skill for the deep review and keep these gates as the minimum baseline.

Default rules:

- Use least privilege and the narrowest data scope.
- Prefer read-only inspection before mutation.
- Keep secrets out of prompts, logs, code, commits, screenshots, and generated artifacts.
- Do not weaken authentication, TLS, validation, sandboxing, logging, or auditability merely to make a workflow easier.
- Require explicit user approval before destructive, irreversible, externally published, production, financial, or high-impact actions unless the user already clearly authorized that exact action.
- Verify state after every external mutation.

## Git and repository discipline

When repository access exists:

1. Inspect project instructions, current branch, relevant files, tests, and local conventions before editing.
2. Keep the diff scoped to the requested outcome.
3. Do not overwrite unrelated user changes.
4. Run the narrowest relevant tests first, then broader checks when warranted.
5. Review the diff for secrets, debug leftovers, generated junk, accidental dependency changes, and unrelated formatting churn.
6. Do not push, merge, publish, tag, deploy, or delete remote resources unless the user requested that action.

## Verification contract

Success requires evidence appropriate to the task. Examples:

- Code change: relevant test or reproduction passes and no new relevant failure appears.
- Bug fix: original reproduction fails before and passes after; regression coverage exists when practical.
- UI: rendered state is inspected at relevant viewport sizes and key interactions work.
- Browser workflow: target state is re-read after the action and matches the requested result.
- MCP/tool: schema validation, auth boundary, error behavior, and a real representative task are tested.
- Skill: package validates, triggering description is specific, and at least one representative prompt is mentally or actually checked.

Do not say "done" when only the implementation was written but not verified. Say what was and was not verified.

## Default handoff

For non-trivial work, end with a compact handoff containing:

- **Route used** and why it fit.
- **Changed / produced**: the concrete result.
- **Verification**: commands, observations, or checks that proved it.
- **Security / approvals**: anything sensitive, deferred, or requiring explicit authorization.
- **Next move**: only if meaningful work remains.

Keep the handoff proportional to the task.

## References

- Read `references/routes.md` for detailed mode selection and per-route workflows.
- Read `references/security-and-approval.md` for mutation, production, credentials, privacy, and supply-chain gates.
- Read `references/upstream-patterns.md` when updating this skill or when the user asks where its patterns came from.
