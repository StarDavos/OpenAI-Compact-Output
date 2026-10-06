---
name: secure-loop-engineering
description: Design, audit, and implement safe autonomous or repeating engineering agent loops with deterministic gates, independent evaluation, durable state, budgets, circuit breakers, and human escalation. Use for CI-fix loops, dependency-update PRs, lint/fix passes, flaky-test triage, issue-to-PR automation, scheduled maintenance agents, bounded optimization, or any repeated engineering workflow where autonomy and security boundaries matter.
---

# Secure Loop Engineering

Build agent loops that can repeat useful engineering work without silently turning autonomy into uncontrolled risk.

## Core workflow

Follow this sequence. Do not skip forward because the user says to make it fully autonomous.

1. Classify the task.
2. Prove one manual run can be made reliable.
3. Define the loop contract.
4. Separate deterministic orchestration from model reasoning.
5. Isolate the builder.
6. Run deterministic gates.
7. Run an independent evaluator with fresh context.
8. Persist state and lessons.
9. Enforce stop conditions, budgets, and circuit breakers.
10. Escalate judgment-heavy or high-risk work to a human.
11. Schedule unattended execution only after observed runs are reliable.
12. Measure accepted outcomes, not activity volume.

Read `references/loop-principles.md` for the source-derived architecture and `references/security-controls.md` for the required hardening layer.

## 1. Decide whether the task is loop-shaped

Require all four conditions before recommending unattended execution:

- The task repeats or has a repeated measurable optimization cycle.
- Bad output can be rejected automatically by at least one objective check.
- The expected token/runtime/retry budget can tolerate failed attempts.
- The agent has enough tools to reproduce, execute, and inspect its own work.

If any condition fails, do not fake autonomy. Recommend either a manual workflow or the smallest subtask that does satisfy the conditions.

Treat these as strong loop candidates: CI failure triage, dependency update PRs, lint/fix passes, flaky-test reproduction, regression checks, issue-to-PR drafts with real coverage, documentation consistency checks, and bounded optimization tasks.

Treat these as human-gated by default: authentication changes, authorization/permissions, payments, production deployments, destructive data migrations, secret-management changes, broad architecture rewrites, security-policy changes, and vague product decisions.

## 2. Define the loop contract

Create or update a loop contract using `assets/LOOP_CONTRACT.template.yaml`.

Always define:

- purpose and measurable finish condition
- trigger type and cadence/event
- allowed and forbidden scope
- builder model/agent role
- deterministic gates and required commands
- independent evaluator role
- state files and persistence rules
- retry, runtime, concurrency, and cost limits
- permissions and secret-access boundaries
- human escalation conditions
- stop conditions and circuit breakers
- success metrics

If the user wants implementation, validate the contract with:

`python scripts/validate_loop_contract.py LOOP_CONTRACT.yaml`

Do not schedule a loop whose contract fails validation.

## 3. Keep deterministic work deterministic

Use ordinary code, CI, shell commands, repository metadata, APIs, and exit codes for facts a rule can decide. Do not ask an LLM to decide whether a command succeeded when the command can report success itself.

Prefer deterministic gates such as:

- unit, integration, and end-to-end tests
- compile/build success
- type checking
- linting/format validation
- schema/API contract validation
- SAST
- dependency vulnerability audit
- secret scanning
- container image/build validation
- reproducible benchmark thresholds

Run these gates before asking the evaluator for a qualitative verdict.

## 4. Separate builder and evaluator

Never let the producing agent be the only authority that decides the work is good enough.

Give the evaluator:

- fresh context whenever possible
- instructions written to find faults rather than confirm success
- the user request and acceptance criteria
- deterministic gate results
- the resulting diff/artifact
- permission to run or interact with the result when tools allow

Prefer a different model or independently initialized agent when available. If only one model exists, use a separate agent/session with fresh context and adversarial instructions.

Require the evaluator to return one of:

- `PASS` with evidence
- `FAIL` with specific defects and the next bounded repair target
- `ESCALATE` when human judgment or restricted access is required

## 5. Isolate work

Use one branch/worktree/sandbox per active task when repository tooling permits. Prevent parallel builders from modifying the same working tree or competing for the same files.

Do not let an autonomous worker write directly to a protected production branch.

Default repository flow:

`task -> isolated worktree -> builder -> gates -> evaluator -> PR -> human review -> merge`

Allow auto-merge only when the user explicitly requests it and the task has been classified low-risk with protected checks that cannot be bypassed by the worker.

## 6. Persist state outside chat

Use durable files for anything needed on the next run. Do not rely on conversation memory as operational state.

Default files:

- `VISION.md`: durable destination and non-negotiable product intent
- `STATE.md`: current position, last run, in-progress work, blockers, escalation queue
- `LESSONS.md`: verified recurring lessons and known environmental constraints
- `LOOP_CONTRACT.yaml`: machine-readable operating contract

Use the templates in `assets/` when creating a new loop.

Keep state factual and diff-readable. Do not write secrets, access tokens, passwords, private keys, or raw sensitive payloads into state files or logs.

## 7. Enforce security invariants

Treat the controls in `references/security-controls.md` as non-negotiable unless the user explicitly asks to design a different policy and understands the tradeoff.

At minimum:

- apply least privilege
- deny production credentials by default
- deny permission escalation
- deny changes to the loop's own security controls
- deny changes that disable gates, branch protection, audit logging, or budget controls
- minimize secret exposure and redact logs
- cap retries, runtime, cost, concurrency, and changed scope
- stop on repeated identical failures
- stop on unexpected scope expansion
- escalate security-sensitive changes

A worker must not be able to increase its own budget, permissions, scope, or authority.

## 8. Add circuit breakers

Stop and escalate when any configured threshold is hit, including:

- max attempts
- max wall-clock runtime
- max cost/token budget
- max changed files or lines if configured
- repeated identical failure signature
- deterministic security gate failure after the retry allowance
- attempt to access a forbidden path or secret
- attempt to modify evaluator/security/budget rules
- unexpected destructive action
- inability to prove the requested acceptance condition

Never respond to a circuit breaker by silently widening permissions or budgets.

## 9. Roll out autonomy gradually

Use this maturity ladder:

1. Manual: perform the workflow interactively until repeatable.
2. Observed loop: run repeated cycles while a human watches.
3. Restricted unattended: schedule with tight scope, no production write access, and mandatory PR review.
4. Mature unattended: expand cadence/concurrency only after the acceptance rate and failure modes are understood.

Roll back one level when failure rate, review burden, or security incidents rise.

## 10. Measure whether the loop is worth keeping

Use `cost per accepted change` as the primary economic metric when the loop creates changes.

Also track:

- accepted changes / generated changes
- human correction time per accepted change
- evaluator rejection rate
- deterministic gate failure rate
- reverted autonomous changes
- security escalations
- average retries per accepted result
- runtime/cost per accepted result

Do not treat commit count, PR count, agent turns, or token volume as success by themselves.

## Output modes

Choose the smallest mode that satisfies the request.

### Design mode

Return:

1. loop suitability verdict
2. strongest automatable slice
3. risk class
4. proposed architecture
5. deterministic gates
6. independent evaluator design
7. permissions/security boundary
8. stop conditions and budgets
9. state files
10. rollout plan
11. metrics

### Audit mode

Inspect an existing loop and return:

1. critical failures first
2. missing objective gates
3. self-review or shared-context weaknesses
4. excessive permissions
5. missing state/stop/budget controls
6. unsafe scheduling or merge behavior
7. concrete remediation order

Do not praise a loop merely because it runs unattended.

### Implementation mode

When repository or filesystem access is available and the user asks for implementation:

1. inspect the current automation, CI, branch model, tests, and security controls
2. create or update `LOOP_CONTRACT.yaml`, `VISION.md`, `STATE.md`, and `LESSONS.md`
3. add only the minimum scheduler/orchestrator needed
4. add deterministic gates before evaluator logic
5. add evaluator instructions with fresh-context behavior
6. add circuit breakers and logging redaction
7. run the validator and available tests
8. present the diff and any remaining human approvals

Do not make production changes, merge protected branches, weaken controls, or retrieve secrets unless the user's explicit request and available authorization permit that action.

## Connector behavior

Use repository, CI, issue-tracker, or messaging connectors only when they are available and authorized. Do not assume a connector exists. If access is unavailable, produce the exact files, commands, or configuration the user can apply.

For Git/GitHub-style systems, prefer PR-based delivery with protected checks and human review for anything beyond low-risk maintenance.

## Response style

Be decisive. If a task should not run unattended, say so and explain the smallest safe automation boundary. If a loop is safe enough to prototype, produce a concrete contract rather than generic advice.
