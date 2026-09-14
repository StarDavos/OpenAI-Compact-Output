# Upstream Pattern Notes

Last reviewed: 2026-09-14

This skill is an original orchestration layer informed by public development-skill repositories and the user's supplied article. It does not vendor or require those skills. Re-check upstream projects before copying commands or depending on their current behavior.

## 1. Vercel Labs - find-skills

Source: https://github.com/vercel-labs/skills/tree/main/skills/find-skills

Useful pattern:

- Search the open skill ecosystem before rebuilding common capability.
- Verify candidate quality, source reputation, adoption, and fit rather than recommending a search result blindly.

How this skill adapts it:

- Discovery is a route, not a prerequisite for every task.
- Third-party skills are treated as supply-chain dependencies and inspected before use.

## 2. Matt Pocock - grill-me / grilling

Source: https://github.com/mattpocock/skills

Useful pattern:

- Resolve consequential uncertainty with a focused interview.
- Ask one question at a time and inspect the codebase instead of asking questions the environment can answer.

Current caution:

- The public `grill-me` wrapper has changed over time and has had dependency/invocation issues. Depend on the principle, not the wrapper name.

How this skill adapts it:

- Clarification is limited to decisions that materially alter scope/risk.
- Experiential uncertainty is routed to a prototype instead of an endless interview.

## 3. Anthropic - frontend-design

Source: https://github.com/anthropics/skills/tree/main/skills/frontend-design

Useful pattern:

- Treat UI as intentional product design rather than generic component assembly.
- Ground aesthetic decisions in the actual subject, audience, and purpose.

How this skill adapts it:

- The Design route requires a visual/design source and a rendered inspection step.

## 4. Vercel Labs - agent-browser

Sources:

- https://github.com/vercel-labs/agent-browser
- https://github.com/vercel-labs/open-agents/tree/main/.agents/skills/agent-browser

Useful pattern:

- Navigate -> snapshot interactive state -> act using stable references -> re-snapshot after state changes.

How this skill adapts it:

- Browser QA uses the same observation/action loop without assuming a specific CLI is installed.
- Consequential submissions are gated by authorization.

## 5. Matt Pocock - prototype

Source: https://github.com/mattpocock/skills/blob/main/docs/engineering/prototype.md

Useful pattern:

- Use a disposable prototype to answer uncertain behavior/state-model or visual-structure questions.
- Keep the prototype easy to exercise and do not quietly harden throwaway code into production.

How this skill adapts it:

- Prototype has separate behavior and visual branches.
- Prototype is the preferred answer when user experience can resolve uncertainty faster than conversation.

## 6. Matt Pocock - diagnosing-bugs

Source: https://github.com/mattpocock/skills/blob/main/docs/engineering/diagnosing-bugs.md

Useful pattern:

- Establish a tight failing feedback loop before proposing a theory.
- Minimize the repro, rank falsifiable hypotheses, instrument, fix, and add regression coverage.

Current caution:

- The upstream documentation explicitly notes that diagnostic artifacts can leak secrets or customer data if not sanitized.
- The heavy workflow can over-trigger on casual bug questions in some models.

How this skill adapts it:

- Diagnose is reserved for hard/unknown-cause failures.
- Artifact redaction is mandatory before sharing.

## 7. Anthropic - skill-creator

Source: https://github.com/anthropics/skills/tree/main/skills/skill-creator

Useful pattern:

- Define expected inputs/outputs and concrete examples before authoring.
- Keep core instructions concise and use progressive disclosure through references/scripts/assets.
- Validate and iterate skills against representative tasks.

How this skill adapts it:

- Skill authoring is a dedicated route when the reusable artifact is agent behavior rather than application code.

## 8. Leonxlnx - image-to-code / Taste Skill

Source: https://github.com/Leonxlnx/taste-skill

Useful pattern:

- For visually important web work, establish a visual reference before implementation and analyze it deeply enough to extract a design system.

How this skill adapts it:

- User-supplied screenshots/mockups can serve as the reference directly.
- Generate new references only when the task needs them and an image generator is available.

## 9. obra - Superpowers subagent-driven-development

Source: https://github.com/obra/superpowers/tree/main/skills/subagent-driven-development

Useful pattern:

- Split independent implementation work into isolated contexts.
- Review task-level output and then perform a whole-change review.

How this skill adapts it:

- Parallelism is conditional on actual runtime support and independence.
- Minimum-context dispatch and explicit acceptance criteria are required.
- Sequential execution is used when subagents are unavailable.

## 10. Anthropic - mcp-builder

Source: https://github.com/anthropics/skills/tree/main/skills/mcp-builder

Useful pattern:

- MCP quality is defined by how well tools enable real agent tasks, not by mirroring an API mechanically.
- Tool schemas, descriptions, errors, and authentication boundaries matter as much as implementation.

How this skill adapts it:

- Design from user workflows backward.
- Prefer narrow typed tools, least privilege, explicit write boundaries, and representative task tests.

## User-supplied article: workflow-first agentic automation

Key ideas incorporated:

- The valuable middle layer is interpretation across imperfect inputs and multiple systems, not merely answer generation.
- Coding agents should inspect, investigate, implement, test, iterate, and hand off rather than emit isolated snippets.
- Specialized agents can be coordinated by an orchestrator with only the permissions each needs.
- Production IT workflows require strict permissions and approval boundaries.
- The right design unit is the workflow: who does the work, which systems/data/decisions/actions are involved, what can fail, and where human approval belongs.

The Development Orchestrator uses those ideas as its control plane: classify the workflow, select the smallest appropriate mode, execute with bounded authority, and verify the result.
