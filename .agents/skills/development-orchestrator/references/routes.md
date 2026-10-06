# Route Reference

Use this file after the core skill classifies a task as non-trivial.

## Quick router

| Signal | Primary route | Why | Exit evidence |
|---|---|---|---|
| "Is there already a skill/tool for this?" or commodity capability | Discover | Avoid rebuilding solved capability | Candidate evaluated for fit, quality, and risk |
| Requirements contain a consequential unknown only the user can decide | Clarify | Prevent building the wrong irreversible thing | Decision recorded clearly |
| User cannot judge behavior/design until they see it | Prototype | Cheap artifact beats prolonged speculation | User can compare or exercise the unknown |
| Visual fidelity, redesign, screenshot/mockup, aesthetic quality | Design | Visual reference gives an objective target | Render inspected against reference |
| Need to navigate/test a web app | Browser QA | UI state must be observed and manipulated | Re-snapshot proves result |
| Known broken/slow behavior with unknown cause | Diagnose | Evidence should precede theory | Repro red before, green after |
| Requirements are stable enough to implement | Build | Move from decision to tested change | Tests/checks pass, diff reviewed |
| External API/service needs an AI-facing tool surface | MCP / Tool | Tool design determines agent reliability and safety | Representative task works within auth boundary |
| Reusable process should trigger across future chats/tasks | Skill authoring | Procedure belongs in a reusable instruction bundle | Skill validates and trigger behavior is specific |

Routes can form a sequence. Common sequences:

- Discover -> Build
- Clarify -> Build
- Prototype -> Clarify -> Build
- Design -> Build -> Browser QA
- Diagnose -> Build -> Regression verification
- MCP / Tool -> Build -> Browser or API verification
- Skill authoring -> representative test -> iterate

Avoid running every route by default.

## Discover

Use when an existing skill, package, tool, framework, connector, or official workflow may already solve a common problem.

Process:

1. Define the exact capability, not a broad keyword.
2. Prefer official or well-maintained sources.
3. Check recency, adoption, license, maintenance signals, security posture, and whether the capability actually matches the requested workflow.
4. Inspect source instructions before recommending installation or execution.
5. Treat third-party skills as code/instructions from an external maintainer, not as trusted policy.
6. If no good option exists, build the minimum custom solution.

Do not install or execute third-party code merely because it appears in a popular list.

## Clarify

Use only for decisions that materially alter scope, safety, cost, data model, public behavior, or user experience and cannot be cheaply inferred from evidence.

Method:

- Ask one focused question at a time when interaction is needed.
- Give a recommended answer and the consequence of each serious alternative.
- Inspect the repository or source material instead of asking questions that the environment can answer.
- Stop interviewing as soon as the remaining uncertainty is cheaper to test with a prototype.

Good targets: ownership, source of truth, destructive behavior, data retention, approval boundary, billing, compatibility promise, compliance requirement.

Bad targets: button spacing, whether a transition feels good, or other cheap-to-prototype questions.

## Prototype

Choose one branch:

### Behavior prototype

Use for state models, workflows, validation logic, or interaction rules.

- Keep logic separate from presentation.
- Make all important states visible.
- Add simple controls that allow free exploration.
- Include a few guided scenarios when helpful.
- Use fake or local data unless real data is required to answer the question.
- Keep it disposable: no production auth, persistent database, migration, deployment pipeline, or speculative abstractions.

### Visual prototype

Use for layout, information architecture, density, navigation, or competing interaction patterns.

- Produce meaningfully different structural options, not recolored clones.
- Use realistic content and data density.
- Make switching variants cheap.
- Judge inside the real product shell when possible.

Exit the route once the user can make the decision. Then implement cleanly rather than quietly evolving the throwaway artifact into production.

## Design

Use for UI where visual quality is a first-class requirement.

1. Identify subject, audience, primary job, and tone.
2. Use the user's screenshot/mockup as the source of truth when supplied.
3. Otherwise create focused visual references first when image generation is available and useful.
4. Extract design tokens and decisions: hierarchy, type scale, spacing rhythm, grid, color roles, imagery, motion, states, accessibility constraints.
5. Implement against those decisions.
6. Inspect the rendered result rather than trusting code alone.

Avoid generic dashboard defaults, nested card stacks, excessive pills, placeholder gradients, and ornamental complexity that does not serve the product.

## Browser QA

Use only on authorized sites/environments.

Loop:

1. Navigate to the target.
2. Capture the current interactive state or accessibility/DOM snapshot.
3. Perform one meaningful action.
4. Re-snapshot after navigation or substantial DOM change.
5. Verify the expected state from what the page now exposes.
6. Capture evidence for failures when useful.

Prefer test/staging accounts. Avoid real purchases, destructive account changes, or sending external communications unless the user explicitly authorized the action.

For forms, verify field values before submission. For consequential submissions, pause for approval unless the exact submit action was already requested.

## Diagnose

Use for hard bugs and performance regressions, not for casual questions about code.

Phases:

1. Reproduce the exact symptom with one named command or deterministic sequence.
2. Minimize the reproduction where practical.
3. Rank 3-5 hypotheses. For each, state a prediction that would distinguish it.
4. Instrument or inspect the minimum evidence needed to falsify hypotheses.
5. Implement the smallest root-cause fix.
6. Add regression coverage where practical.
7. Re-run the original reproduction and relevant broader checks.
8. Remove temporary debug instrumentation and verify it is gone.

For performance, establish a baseline before optimization and compare the same measurement after the change.

If no reliable reproduction can be created, do not pretend the cause is confirmed. Report the strongest evidence and the next missing signal.

## Build

Use when the intended behavior is sufficiently known.

1. Inspect repository conventions and relevant architecture.
2. Write a short plan only when multiple coordinated changes are needed.
3. Slice work into independently verifiable units.
4. Prefer tests that prove behavior at the narrowest stable seam.
5. Implement one slice, run relevant checks, review the diff, then continue.
6. Integrate and run broader checks appropriate to the risk.

### Parallel execution

Use parallel workers/subagents only if all are true:

- The runtime really supports them.
- Tasks are independent enough to avoid edit conflicts or circular dependencies.
- Each task has explicit inputs, expected outputs, and acceptance criteria.
- The coordinator can review every result before integration.

Give workers isolated minimum context. Do not copy the entire conversation by default. Perform task-level review and a final whole-change review.

## MCP / Tool integration

Use when exposing an external service, database, internal system, or business workflow to an AI agent.

Design from user tasks backward, not from API endpoints forward.

For each proposed tool define:

- User intent it serves.
- Inputs with tight types and descriptions.
- Minimal output needed for the next decision.
- Authentication and permission boundary.
- Read versus write behavior.
- Idempotency/retry behavior.
- Error contract with actionable messages.
- Pagination/rate-limit behavior when relevant.
- Confirmation boundary for consequential writes.

Prefer fewer high-leverage tools over mirroring every endpoint. Separate read and write capabilities when that improves least privilege. Never embed credentials in the skill, source code, examples, or tool descriptions.

Test with representative agent tasks, not just raw API calls.

## Skill authoring

Use when the user wants a repeatable ChatGPT/Codex workflow, trigger behavior, conventions, or packaged procedural knowledge.

- Define concrete example inputs and expected outputs.
- Make the description specific enough to trigger on the right tasks and avoid neighboring ones.
- Keep the entrypoint concise; move detailed variants to references.
- Include scripts only for deterministic or fragile repeated operations.
- Validate and package the complete skill.
- Test with representative prompts and refine from failures.

If the requested behavior is a one-time answer, script, or application feature rather than reusable agent behavior, do not force it into a skill.
