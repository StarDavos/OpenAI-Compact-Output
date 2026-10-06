# Loop Engineering Principles

Use this reference to preserve the architecture distilled from the source material that motivated this skill.

## Stack

Treat prompt, context, harness, and loop engineering as separate layers:

- Prompt: what one message tells the model.
- Context: what the model sees in one working window.
- Harness: tools, permissions, environment, and completion checks for one run.
- Loop: the controller above the harness that decides how work repeats over time.

Higher layers compound mistakes for longer. A weak unattended loop can repeat an error long after a bad prompt or bad single run would have been noticed.

## Five required parts

Every useful loop needs:

1. Trigger - what starts a run.
2. Work - what the agent does.
3. Gate - an objective mechanism that can reject output.
4. State - durable progress outside the conversation.
5. Stop - a success condition plus a hard cap when success never arrives.

A practical cycle is:

`discover -> isolate/hand off -> verify -> persist -> schedule next`

## Loop types

Classify by what starts and ends the work:

- Turn-based: a human starts it; the agent stops when the task is done.
- Goal-based: a measurable finish line starts repeated attempts; an evaluator confirms completion.
- Time-based: a timer starts repeated work; cancellation/completion ends it.
- Proactive: an event or schedule starts work without a person watching; each spawned task exits on its own goal.

Do not confuse scheduling with stopping. They are separate controls.

## Evaluator principle

Do not make the author the sole reviewer of its own work. The producing context contains reasons supporting the chosen implementation and can bias self-review.

Use a separate evaluator with its own instructions, a fault-finding stance, and real interaction with the output when possible. Prefer evidence from execution over source-code appearance.

## Loop suitability filter

Require:

- recurring/repeated work
- automatic rejection of bad output
- enough budget for retries and wasted runs
- tools that let the agent reproduce and inspect results

When review capacity is already the bottleneck, more generated output can lengthen the queue instead of shortening it.

## State and destination

Persist the current position separately from the destination:

- state answers "where are we now?"
- vision answers "where are we trying to end up?"

Use durable files so a cleared context does not erase operational memory.

## Parallel isolation

Give parallel agents isolated workspaces such as Git worktrees. Do not allow multiple workers to edit the same checkout concurrently.

## Deterministic orchestration

Anything a rule can decide should be handled by deterministic code. Assemble known context, run checks, and enforce hard pipeline steps outside the model where possible.

## Human judgment remains scarce

Automate generation and bounded execution; preserve human judgment for ambiguous, high-impact, or irreversible choices.

## Economic metric

Prefer cost per accepted change/result over token count, run count, PR count, or other activity metrics.
