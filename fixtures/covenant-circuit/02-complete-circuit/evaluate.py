#!/usr/bin/env python3
"""Complete fixture-local Covenant Circuit evaluators for TranchNode issue #13.

Run:
    python fixtures/covenant-circuit/02-complete-circuit/evaluate.py

This remains noncanonical authority-module logic. It does not modify ontology
v0.1, mint canonical receipts, add cross-scope semantics, or introduce a new
hash chain.
"""

from copy import deepcopy
from datetime import datetime
import hashlib
import json


FULFILLMENT_BY_DISPOSITION = {
    "consumed": "scoped_complete",
    "substituted": "scoped_complete",
    "partially_consumed": "partial",
    "declined": "attempted",
    "not_made_available": "attempted",
    "outcome_unknown": "scope_uncertain",
}
PURPOSE_COMPATIBLE = {"identical", "narrows", "operationalizes", "preserves"}
PURPOSE_INCOMPATIBLE = {"expands", "reinterprets", "replaces", "conflicts", "diverts"}
PROTECTED_EFFECTS = {
    "coercion", "unauthorized_disclosure", "demanded_photo", "publication",
    "dietary_constraint_breach", "return_path_suppressed",
}


def stable_bytes(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def canonical_grant_body(grant):
    excluded = {"seal", "parentSeal", "grantorSignature", "grantorSignatureValid", "displayPath"}
    return {key: grant[key] for key in sorted(grant) if key not in excluded}


def expected_seal(parent_seal, grant):
    payload = stable_bytes({"parentSeal": parent_seal, "grantBody": canonical_grant_body(grant)})
    return hashlib.sha256(payload).hexdigest()


def iso_time(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def scope_subset(child, parent):
    if child == parent:
        return True
    if not isinstance(child, dict) or not isinstance(parent, dict):
        return False
    return all(key in parent and value == parent[key] for key, value in child.items())


def is_authorized(grants, terminal_grant_id, act, evaluated_at):
    by_id = {grant["id"]: grant for grant in grants}
    failures, chain, seen = [], [], set()
    current_id = terminal_grant_id
    now = iso_time(evaluated_at)

    while current_id is not None:
        if current_id in seen:
            failures.append("authority.chain_cycle")
            break
        seen.add(current_id)
        grant = by_id.get(current_id)
        if grant is None:
            failures.append(f"authority.missing_grant:{current_id}")
            break
        chain.append(grant)
        current_id = grant.get("parentGrantId")

    if not chain or failures:
        return {"result": "indeterminate", "failures": failures, "chain": [g["id"] for g in chain]}

    chain.reverse()
    previous = None
    for grant in chain:
        parent_seal = previous.get("seal") if previous else grant.get("parentSeal")
        if grant.get("seal") != expected_seal(parent_seal, grant):
            failures.append(f"authority.invalid_seal:{grant['id']}")
        if not grant.get("grantorSignatureValid", False):
            failures.append(f"authority.invalid_signature:{grant['id']}")
        if grant.get("revoked", False) or grant.get("revocationRef"):
            failures.append(f"authority.revoked:{grant['id']}")
        if iso_time(grant["issuedAt"]) > now:
            failures.append(f"authority.not_yet_valid:{grant['id']}")
        if grant.get("expiresAt") and iso_time(grant["expiresAt"]) <= now:
            failures.append(f"authority.expired:{grant['id']}")

        if previous is not None:
            if not previous.get("transferable", False):
                failures.append(f"authority.parent_not_transferable:{previous['id']}")
            if grant["grantorId"] != previous["granteeId"]:
                failures.append(f"authority.broken_handoff:{grant['id']}")
            if grant["fatherhandId"] != previous["fatherhandId"]:
                failures.append(f"authority.fatherhand_changed:{grant['id']}")
            if not set(grant["capabilities"]).issubset(set(previous["delegableCapabilities"])):
                failures.append(f"authority.capability_enlargement:{grant['id']}")
            if not scope_subset(grant["scope"], previous["delegableScope"]):
                failures.append(f"authority.scope_enlargement:{grant['id']}")
            if grant["purposeId"] != previous["purposeId"]:
                failures.append(f"authority.purpose_changed:{grant['id']}")
        previous = grant

    terminal = chain[-1]
    held = set(terminal.get("capabilities", [])) - set(terminal.get("consumedCapabilities", []))
    failures.extend(
        f"authority.capability_not_held:{capability}"
        for capability in sorted(set(act.get("capabilitiesExercised", [])) - held)
    )
    if not scope_subset(act.get("scope", {}), terminal.get("scope", {})):
        failures.append("authority.act_outside_scope")

    invalid_prefixes = (
        "authority.invalid_", "authority.revoked", "authority.expired",
        "authority.not_yet_valid", "authority.parent_not_transferable",
        "authority.broken_handoff", "authority.fatherhand_changed",
        "authority.capability_enlargement", "authority.scope_enlargement",
        "authority.purpose_changed", "authority.capability_not_held",
        "authority.act_outside_scope",
    )
    result = "invalid" if any(item.startswith(invalid_prefixes) for item in failures) else "valid"
    return {"result": result, "failures": failures, "chain": [g["id"] for g in chain]}


def is_purpose_compatible(grant_purpose_id, active_purpose_id, context):
    relation = context.get("relations", {}).get(f"{grant_purpose_id}->{active_purpose_id}", "indeterminate")
    conflicts = sorted(context.get("conflicts", []))
    tensions = context.get("unresolvedTensions", [])
    displaced = sorted(context.get("displacedCommitments", []))
    if conflicts or displaced or any(tension.get("blocking", False) for tension in tensions):
        result = "indeterminate"
    elif relation in PURPOSE_COMPATIBLE:
        result = "compatible"
    elif relation in PURPOSE_INCOMPATIBLE:
        result = "incompatible"
    else:
        result = "indeterminate"
    return {
        "relation": relation,
        "result": result,
        "conflicts": conflicts,
        "unresolvedTensions": tensions,
        "displacedCommitments": displaced,
    }


def reckon_stewardship(graph, context):
    authority = is_authorized(
        graph.get("grants", []), graph["commission"]["terminalGrantId"],
        graph["provisionAct"], context["evaluatedAt"],
    )
    purpose = is_purpose_compatible(
        graph["terminalGrantPurposeId"], graph["commission"]["governingPurposeId"],
        graph.get("purposeContext", {}),
    )
    reasons = list(authority["failures"])
    reasons.extend(f"purpose.conflict:{item}" for item in purpose["conflicts"])
    reasons.extend(f"purpose.displaced_commitment:{item}" for item in purpose["displacedCommitments"])

    act = graph["provisionAct"]
    breaches = sorted(set(act.get("effects", [])) & PROTECTED_EFFECTS)
    if breaches:
        fidelity = "breached"
        reasons.extend(f"fidelity.protected_commitment_breached:{item}" for item in breaches)
    elif purpose["result"] == "incompatible":
        fidelity = "drifted"
        reasons.append("fidelity.purpose_incompatible")
    elif purpose["result"] == "indeterminate":
        fidelity = "indeterminate"
        reasons.append("fidelity.purpose_indeterminate")
    elif not context.get("returnPathPresent", True):
        fidelity = "drifted"
        reasons.append("fidelity.return_path_omitted")
    elif act.get("safeSuitable") is True and act.get("voluntary") is True:
        fidelity = "faithful"
        reasons.append("fidelity.duties_and_commitments_preserved")
    else:
        fidelity = "indeterminate"
        reasons.append("fidelity.insufficient_evidence")

    witness = graph.get("dispositionWitness")
    if witness is None or not witness.get("eligible", False):
        fulfillment = "scope_uncertain"
        reasons.append("fulfillment.no_responsible_disposition_witness")
    else:
        disposition = witness.get("disposition", "outcome_unknown")
        fulfillment = FULFILLMENT_BY_DISPOSITION.get(disposition, "scope_uncertain")
        reasons.append(f"fulfillment.disposition:{disposition}")

    execution = "complete"
    if not context.get("returnPathPresent", True):
        execution = "incomplete_execution"
    elif context.get("closeRequested", False) and not witness:
        execution = "incomplete_execution"
        reasons.append("execution.close_without_disposition_witness")

    if authority["result"] == "invalid":
        response = "suspend"
    elif fidelity == "breached":
        response = "repair"
    elif execution == "incomplete_execution" or fulfillment in {"scope_uncertain", "partial"}:
        response = "review"
    else:
        response = "none"

    return {
        "authorization": authority["result"],
        "purposeCompatibility": purpose["result"],
        "fidelity": fidelity,
        "fulfillment": fulfillment,
        "execution": execution,
        "requiredResponse": response,
        "reasons": reasons,
    }


def make_grant(grant_id, parent, grantor, grantee, capabilities, scope, purpose,
               transferable=True, delegable_capabilities=None, delegable_scope=None,
               revoked=False, expires_at=None):
    grant = {
        "id": grant_id,
        "parentGrantId": parent["id"] if parent else None,
        "fatherhandId": parent["fatherhandId"] if parent else "fatherhand.caregiver-c",
        "grantorId": grantor,
        "granteeId": grantee,
        "capabilities": capabilities,
        "scope": scope,
        "purposeId": purpose,
        "transferable": transferable,
        "delegableCapabilities": delegable_capabilities if delegable_capabilities is not None else capabilities,
        "delegableScope": delegable_scope if delegable_scope is not None else scope,
        "retainedCapabilities": capabilities,
        "consumedCapabilities": [],
        "issuedAt": "2026-08-01T00:00:00Z",
        "expiresAt": expires_at,
        "revocationRef": "revocation.test" if revoked else None,
        "revoked": revoked,
        "parentSeal": parent["seal"] if parent else None,
        "grantorSignatureValid": True,
    }
    grant["seal"] = expected_seal(grant["parentSeal"], grant)
    return grant


SCOPE = {"child": "child-c", "mealWindow": "window-w"}
PURPOSE = "purpose.satisfy-meal-need"
ROOT_CAPS = ["prepare_meal", "transport_meal", "offer_meal", "report_meal_disposition", "request_safe_substitution"]
ROOT = make_grant("grant.root", None, "caregiver-c", "provider-p", ROOT_CAPS, SCOPE, PURPOSE)
TERMINAL = make_grant("grant.provider", ROOT, "provider-p", "steward-s", ROOT_CAPS, SCOPE, PURPOSE)
BASE_COMMISSION = {
    "id": "commission.meal.child-c.window-w",
    "terminalGrantId": "grant.provider",
    "governingPurposeId": PURPOSE,
    "protectedCommitments": ["bodily_autonomy", "dignity", "privacy_minimization", "food_safety", "honest_reporting"],
}


def base_graph():
    return {
        "grants": [deepcopy(ROOT), deepcopy(TERMINAL)],
        "terminalGrantPurposeId": PURPOSE,
        "commission": deepcopy(BASE_COMMISSION),
        "purposeContext": {
            "relations": {f"{PURPOSE}->{PURPOSE}": "identical"},
            "conflicts": [], "unresolvedTensions": [], "displacedCommitments": [],
        },
        "provisionAct": {
            "capabilitiesExercised": ["prepare_meal", "offer_meal"],
            "scope": deepcopy(SCOPE), "safeSuitable": True, "voluntary": True,
            "effects": [],
        },
        "dispositionWitness": {
            "eligible": True, "role": "receiving_caregiver", "disposition": "consumed",
        },
        "diagnostics": {"mealReferenceCount": 1},
    }


def case(name, mutate, expected, context=None):
    graph = base_graph()
    mutate(graph)
    return {
        "name": name,
        "graph": graph,
        "context": {
            "evaluatedAt": "2026-08-05T12:00:00Z", "returnPathPresent": True,
            **(context or {}),
        },
        "expected": expected,
    }


CASES = [
    case("authorized_consumed", lambda g: None, {"authorization": "valid", "purposeCompatibility": "compatible", "fidelity": "faithful", "fulfillment": "scoped_complete", "execution": "complete"}),
    case("unauthorized_disclosure", lambda g: (g["provisionAct"]["capabilitiesExercised"].append("disclose_meal_thread"), g["provisionAct"]["effects"].append("unauthorized_disclosure")), {"authorization": "invalid", "purposeCompatibility": "compatible", "fidelity": "breached", "fulfillment": "scoped_complete", "execution": "complete"}),
    case("photo_demand", lambda g: g["provisionAct"]["effects"].append("demanded_photo"), {"authorization": "valid", "purposeCompatibility": "compatible", "fidelity": "breached", "fulfillment": "scoped_complete", "execution": "complete"}),
    case("graph_density_without_witness", lambda g: (g.__setitem__("dispositionWitness", None), g["diagnostics"].__setitem__("mealReferenceCount", 10000)), {"authorization": "valid", "purposeCompatibility": "compatible", "fidelity": "faithful", "fulfillment": "scope_uncertain", "execution": "complete"}),
    case("provisional_purpose_conflict", lambda g: g["purposeContext"].update({"relations": {f"{PURPOSE}->{PURPOSE}": "preserves"}, "unresolvedTensions": [{"id": "tension.care-plan", "blocking": True}]}), {"authorization": "valid", "purposeCompatibility": "indeterminate", "fidelity": "indeterminate", "fulfillment": "scoped_complete", "execution": "complete"}),
    case("incomplete_execution", lambda g: g.__setitem__("dispositionWitness", None), {"authorization": "valid", "purposeCompatibility": "compatible", "fidelity": "drifted", "fulfillment": "scope_uncertain", "execution": "incomplete_execution"}, {"returnPathPresent": False}),
    case("declined_without_coercion", lambda g: g["dispositionWitness"].__setitem__("disposition", "declined"), {"authorization": "valid", "purposeCompatibility": "compatible", "fidelity": "faithful", "fulfillment": "attempted", "execution": "complete"}),
    case("dietary_breach", lambda g: (g["provisionAct"].__setitem__("safeSuitable", False), g["provisionAct"]["effects"].append("dietary_constraint_breach"), g["dispositionWitness"].__setitem__("disposition", "not_made_available")), {"authorization": "valid", "purposeCompatibility": "compatible", "fidelity": "breached", "fulfillment": "attempted", "execution": "complete"}),
    case("revoked_grant_beneficial_outcome", lambda g: (g["grants"][-1].__setitem__("revoked", True), g["grants"][-1].__setitem__("revocationRef", "revocation.provider")), {"authorization": "invalid", "purposeCompatibility": "compatible", "fidelity": "faithful", "fulfillment": "scoped_complete", "execution": "complete"}),
    case("close_without_witness", lambda g: g.__setitem__("dispositionWitness", None), {"authorization": "valid", "purposeCompatibility": "compatible", "fidelity": "faithful", "fulfillment": "scope_uncertain", "execution": "incomplete_execution"}, {"closeRequested": True}),
]


def main():
    results = []
    for item in CASES:
        graph_before, context_before = stable_bytes(item["graph"]), stable_bytes(item["context"])
        receipt = reckon_stewardship(item["graph"], item["context"])
        assert stable_bytes(item["graph"]) == graph_before, f"{item['name']}: graph mutated"
        assert stable_bytes(item["context"]) == context_before, f"{item['name']}: context mutated"
        for field, expected in item["expected"].items():
            assert receipt[field] == expected, f"{item['name']}: expected {field}={expected}, got {receipt[field]}"
        results.append({"case": item["name"], "receipt": receipt})

    by_name = {item["case"]: item["receipt"] for item in results}
    assert by_name["unauthorized_disclosure"]["fulfillment"] == "scoped_complete"
    assert by_name["unauthorized_disclosure"]["authorization"] == "invalid"
    assert by_name["revoked_grant_beneficial_outcome"]["fidelity"] == "faithful"
    assert by_name["revoked_grant_beneficial_outcome"]["authorization"] == "invalid"
    assert by_name["graph_density_without_witness"]["fulfillment"] == "scope_uncertain"
    assert by_name["provisional_purpose_conflict"]["purposeCompatibility"] == "indeterminate"
    assert by_name["close_without_witness"]["execution"] == "incomplete_execution"

    print(json.dumps(results, indent=2, sort_keys=True))
    print(f"\n{len(results)} complete Covenant Circuit cases passed.")


if __name__ == "__main__":
    main()
