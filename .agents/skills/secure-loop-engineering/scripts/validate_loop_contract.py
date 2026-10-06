#!/usr/bin/env python3
"""Validate required safety properties in a Secure Loop Engineering contract."""

from __future__ import annotations

import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML is required (import yaml failed).", file=sys.stderr)
    sys.exit(2)


REQUIRED_TOP_LEVEL = {
    "version",
    "name",
    "purpose",
    "risk_class",
    "trigger",
    "scope",
    "state",
    "builder",
    "deterministic_gates",
    "reviewer",
    "security",
    "limits",
    "stop_conditions",
    "escalation",
    "metrics",
}

ALLOWED_RISKS = {"low", "medium", "high"}
ALLOWED_TRIGGER_TYPES = {"manual", "goal", "time", "event", "proactive"}


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def require_dict(parent: dict, key: str, errors: list[str]) -> dict:
    value = parent.get(key)
    if not isinstance(value, dict):
        fail(errors, f"{key}: must be a mapping")
        return {}
    return value


def require_positive_number(parent: dict, key: str, errors: list[str]) -> None:
    value = parent.get(key)
    if not isinstance(value, (int, float)) or isinstance(value, bool) or value <= 0:
        fail(errors, f"limits.{key}: must be a positive number")


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: validate_loop_contract.py LOOP_CONTRACT.yaml", file=sys.stderr)
        return 2

    path = Path(sys.argv[1])
    if not path.is_file():
        print(f"ERROR: file not found: {path}", file=sys.stderr)
        return 2

    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"ERROR: invalid YAML: {exc}", file=sys.stderr)
        return 2

    if not isinstance(data, dict):
        print("ERROR: contract root must be a mapping", file=sys.stderr)
        return 2

    errors: list[str] = []

    missing = sorted(REQUIRED_TOP_LEVEL - set(data))
    if missing:
        fail(errors, "missing top-level keys: " + ", ".join(missing))

    risk = data.get("risk_class")
    if risk not in ALLOWED_RISKS:
        fail(errors, f"risk_class: must be one of {sorted(ALLOWED_RISKS)}")

    trigger = require_dict(data, "trigger", errors)
    if trigger and trigger.get("type") not in ALLOWED_TRIGGER_TYPES:
        fail(errors, f"trigger.type: must be one of {sorted(ALLOWED_TRIGGER_TYPES)}")

    scope = require_dict(data, "scope", errors)
    if scope:
        allowed = scope.get("allowed_paths")
        if not isinstance(allowed, list) or not allowed:
            fail(errors, "scope.allowed_paths: must be a non-empty list")
        forbidden = scope.get("forbidden_paths")
        if not isinstance(forbidden, list):
            fail(errors, "scope.forbidden_paths: must be a list")

    gates = data.get("deterministic_gates")
    if not isinstance(gates, list) or not gates:
        fail(errors, "deterministic_gates: must contain at least one gate")
    else:
        for idx, gate in enumerate(gates):
            if not isinstance(gate, dict):
                fail(errors, f"deterministic_gates[{idx}]: must be a mapping")
                continue
            if not gate.get("name"):
                fail(errors, f"deterministic_gates[{idx}].name: required")
            if not gate.get("command"):
                fail(errors, f"deterministic_gates[{idx}].command: required")
            if gate.get("required") is not True:
                fail(errors, f"deterministic_gates[{idx}].required: must be true")

    reviewer = require_dict(data, "reviewer", errors)
    if reviewer:
        if reviewer.get("independent_context") is not True:
            fail(errors, "reviewer.independent_context: must be true")
        verdicts = set(reviewer.get("verdicts") or [])
        needed = {"PASS", "FAIL", "ESCALATE"}
        if not needed.issubset(verdicts):
            fail(errors, "reviewer.verdicts: must include PASS, FAIL, and ESCALATE")

    security = require_dict(data, "security", errors)
    if security:
        must_be_false = {
            "may_modify_security_controls",
            "may_modify_budget",
            "may_escalate_permissions",
            "protected_branch_direct_write",
        }
        for key in sorted(must_be_false):
            if security.get(key) is not False:
                fail(errors, f"security.{key}: must be false")
        if risk == "high" and security.get("production_write_access") is not False:
            fail(errors, "security.production_write_access: must be false for high-risk loops")
        if security.get("secrets_in_logs") != "forbidden":
            fail(errors, "security.secrets_in_logs: must be 'forbidden'")

    limits = require_dict(data, "limits", errors)
    if limits:
        for key in ("max_attempts", "max_runtime_minutes", "max_concurrency", "max_cost_usd"):
            require_positive_number(limits, key, errors)

    stop = require_dict(data, "stop_conditions", errors)
    if stop:
        if not stop.get("success"):
            fail(errors, "stop_conditions.success: required")
        breakers = set(stop.get("circuit_breakers") or [])
        required_breakers = {
            "repeated_identical_failure",
            "forbidden_scope_change",
            "security_control_change",
            "secret_exposure",
            "budget_exceeded",
        }
        missing_breakers = sorted(required_breakers - breakers)
        if missing_breakers:
            fail(errors, "stop_conditions.circuit_breakers missing: " + ", ".join(missing_breakers))

    escalation = require_dict(data, "escalation", errors)
    if escalation:
        if escalation.get("human_review_required") is not True:
            fail(errors, "escalation.human_review_required: must be true")
        conditions = set(escalation.get("conditions") or [])
        if "reviewer_returns_ESCALATE" not in conditions:
            fail(errors, "escalation.conditions: must include reviewer_returns_ESCALATE")
        if risk == "high" and "high_risk_change" not in conditions:
            fail(errors, "escalation.conditions: high-risk contracts must include high_risk_change")

    if errors:
        print("INVALID LOOP CONTRACT")
        for error in errors:
            print(f"- {error}")
        return 1

    print("VALID LOOP CONTRACT")
    print("Required safety invariants are present. This does not replace project-specific review.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
