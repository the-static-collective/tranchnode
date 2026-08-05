#!/usr/bin/env python3
"""NanaSpork Covenant Circuit representative-carrier fixture.

Run:
    python fixtures/covenant-circuit/01-nanaspork-representative-carrier/evaluate.py

This file is intentionally fixture-local and noncanonical. It introduces no
TranchNode node kinds, edge kinds, cross-scope semantics, grant chain, receipt
envelope, or hash chain. It proves only that authorization, fidelity, and
fulfillment can be evaluated independently without mutating the input graph.
"""

from copy import deepcopy
import json


FULFILLMENT_BY_DISPOSITION = {
    "consumed": "scoped_complete",
    "substituted": "scoped_complete",
    "partially_consumed": "partial",
    "declined": "attempted",
    "not_made_available": "attempted",
    "outcome_unknown": "scope_uncertain",
}


def _stable_bytes(value):
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    ).encode("utf-8")


def reckon_stewardship(graph, context):
    """Purely aggregate independent authorization, fidelity, and fulfillment."""
    reasons = []

    commission = graph["commission"]
    act = graph["provisionAct"]
    authority_receipt = graph.get("authorityReceipt")
    disposition_witness = graph.get("dispositionWitness")

    # Authorization is determined from explicit authority evidence and the
    # capability envelope. Witnesses, graph density, intent, and outcome are
    # deliberately ignored.
    if authority_receipt is None:
        authorization = "indeterminate"
        reasons.append("authorization.missing_authority_receipt")
    elif authority_receipt["result"] != "valid":
        authorization = authority_receipt["result"]
        reasons.append(
            f"authorization.authority_receipt_{authority_receipt['result']}"
        )
    else:
        exercised = set(act["capabilitiesExercised"])
        allowed = set(commission["allowedCapabilities"])
        outside_envelope = sorted(exercised - allowed)
        if outside_envelope:
            authorization = "invalid"
            reasons.extend(
                f"authorization.capability_outside_commission:{capability}"
                for capability in outside_envelope
            )
        else:
            authorization = "valid"
            reasons.append("authorization.valid_authority_and_capability_envelope")

    # Fidelity is evaluated against purpose, duties, and protected commitments.
    # It is not derived from authorization or fulfillment.
    effects = set(act.get("effects", []))
    protected_breaches = sorted(
        effects.intersection(
            {
                "coercion",
                "unauthorized_disclosure",
                "demanded_photo",
                "publication",
                "dietary_constraint_breach",
            }
        )
    )

    if protected_breaches:
        fidelity = "breached"
        reasons.extend(
            f"fidelity.protected_commitment_breached:{breach}"
            for breach in protected_breaches
        )
    elif not context.get("returnPathPresent", True):
        fidelity = "drifted"
        reasons.append("fidelity.return_path_omitted")
    elif act.get("safeSuitable") is True and act.get("voluntary") is True:
        fidelity = "faithful"
        reasons.append("fidelity.duties_and_commitments_preserved")
    else:
        fidelity = "indeterminate"
        reasons.append("fidelity.insufficient_purpose_or_commitment_evidence")

    # Fulfillment requires a policy-recognized disposition witness. Reference
    # count and graph density are diagnostic only and cannot manufacture one.
    if disposition_witness is None:
        fulfillment = "scope_uncertain"
        reasons.append("fulfillment.no_responsible_disposition_witness")
    elif not disposition_witness.get("eligible", False):
        fulfillment = "scope_uncertain"
        reasons.append("fulfillment.ineligible_disposition_witness")
    else:
        disposition = disposition_witness["disposition"]
        fulfillment = FULFILLMENT_BY_DISPOSITION.get(
            disposition, "scope_uncertain"
        )
        reasons.append(f"fulfillment.disposition:{disposition}")

    execution = (
        "complete"
        if context.get("returnPathPresent", True)
        else "incomplete_execution"
    )

    return {
        "authorization": authorization,
        "fidelity": fidelity,
        "fulfillment": fulfillment,
        "execution": execution,
        "reasons": reasons,
    }


def render_meaning(receipt, graph):
    """Render calibration prose without collapsing the receipt fields."""
    disposition_witness = graph.get("dispositionWitness")
    effects = set(graph["provisionAct"].get("effects", []))

    if (
        receipt["authorization"] == "valid"
        and receipt["fidelity"] == "faithful"
        and receipt["fulfillment"] == "scope_uncertain"
        and disposition_witness is None
    ):
        return (
            "The provider acted faithfully, the child's autonomy remained intact, "
            "food was made available, and fulfillment remains unknown."
        )

    if (
        disposition_witness is not None
        and disposition_witness.get("eligible")
        and disposition_witness.get("disposition") == "consumed"
        and (
            receipt["authorization"] == "invalid"
            or receipt["fidelity"] == "breached"
        )
    ):
        return (
            "The child ate, but the method breached authority or protected "
            "commitments."
        )

    if (
        disposition_witness is not None
        and disposition_witness.get("eligible")
        and disposition_witness.get("disposition") == "declined"
        and "coercion" not in effects
    ):
        return (
            "The child declined, the refusal remained intact, and a faithful "
            "attempt was not recoded as either fulfillment or breach."
        )

    return (
        f"Authorization: {receipt['authorization']}; "
        f"fidelity: {receipt['fidelity']}; "
        f"fulfillment: {receipt['fulfillment']}."
    )


BASE_COMMISSION = {
    "domainType": "StewardshipCommission",
    "id": "commission.meal.child-c.window-w",
    "allowedCapabilities": [
        "prepare_meal",
        "transport_meal",
        "offer_meal",
        "report_meal_disposition",
    ],
    "duties": [
        "make_meal_materially_available",
        "support_voluntary_consumption",
        "report_disposition_honestly",
    ],
    "protectedCommitments": [
        "bodily_autonomy",
        "dignity",
        "privacy_minimization",
        "food_safety",
        "honest_reporting",
    ],
}


CASES = [
    {
        "name": "delivered_outcome_unknown",
        "graph": {
            "commission": BASE_COMMISSION,
            "authorityReceipt": {
                "domainType": "AuthorityValidationReceipt",
                "result": "valid",
            },
            "provisionAct": {
                "domainType": "MealProvisionAct",
                "capabilitiesExercised": [
                    "prepare_meal",
                    "transport_meal",
                    "offer_meal",
                ],
                "safeSuitable": True,
                "voluntary": True,
                "foodMateriallyAvailable": True,
                "effects": [],
            },
            "dispositionWitness": None,
            "diagnostics": {"mealReferenceCount": 4},
        },
        "context": {"returnPathPresent": True},
        "expected": {
            "authorization": "valid",
            "fidelity": "faithful",
            "fulfillment": "scope_uncertain",
            "execution": "complete",
        },
        "meaning": (
            "The provider acted faithfully, the child's autonomy remained intact, "
            "food was made available, and fulfillment remains unknown."
        ),
    },
    {
        "name": "child_eats_after_unauthorized_disclosure",
        "graph": {
            "commission": BASE_COMMISSION,
            "authorityReceipt": {
                "domainType": "AuthorityValidationReceipt",
                "result": "valid",
            },
            "provisionAct": {
                "domainType": "MealProvisionAct",
                "capabilitiesExercised": [
                    "prepare_meal",
                    "offer_meal",
                    "disclose_meal_thread",
                ],
                "safeSuitable": True,
                "voluntary": True,
                "foodMateriallyAvailable": True,
                "effects": ["unauthorized_disclosure"],
            },
            "dispositionWitness": {
                "domainType": "ConsequenceWitnessReceipt",
                "eligible": True,
                "role": "receiving_caregiver",
                "disposition": "consumed",
                # Even an ill-shaped witness cannot manufacture authority.
                "grantsCapability": "disclose_meal_thread",
            },
            "diagnostics": {"mealReferenceCount": 1},
        },
        "context": {"returnPathPresent": True},
        "expected": {
            "authorization": "invalid",
            "fidelity": "breached",
            "fulfillment": "scoped_complete",
            "execution": "complete",
        },
        "meaning": (
            "The child ate, but the method breached authority or protected "
            "commitments."
        ),
    },
    {
        "name": "graph_density_without_responsible_witness",
        "graph": {
            "commission": BASE_COMMISSION,
            "authorityReceipt": None,
            "provisionAct": {
                "domainType": "MealProvisionAct",
                "capabilitiesExercised": ["offer_meal"],
                "safeSuitable": True,
                "voluntary": True,
                "foodMateriallyAvailable": True,
                "effects": [],
            },
            "dispositionWitness": None,
            "diagnostics": {"mealReferenceCount": 10000},
        },
        "context": {"returnPathPresent": True},
        "expected": {
            "authorization": "indeterminate",
            "fidelity": "faithful",
            "fulfillment": "scope_uncertain",
            "execution": "complete",
        },
    },
    {
        "name": "child_declines_without_coercion",
        "graph": {
            "commission": BASE_COMMISSION,
            "authorityReceipt": {
                "domainType": "AuthorityValidationReceipt",
                "result": "valid",
            },
            "provisionAct": {
                "domainType": "MealProvisionAct",
                "capabilitiesExercised": [
                    "prepare_meal",
                    "offer_meal",
                    "report_meal_disposition",
                ],
                "safeSuitable": True,
                "voluntary": True,
                "foodMateriallyAvailable": True,
                "effects": [],
            },
            "dispositionWitness": {
                "domainType": "ConsequenceWitnessReceipt",
                "eligible": True,
                "role": "receiving_caregiver",
                "disposition": "declined",
            },
            "diagnostics": {"mealReferenceCount": 2},
        },
        "context": {"returnPathPresent": True},
        "expected": {
            "authorization": "valid",
            "fidelity": "faithful",
            "fulfillment": "attempted",
            "execution": "complete",
        },
        "meaning": (
            "The child declined, the refusal remained intact, and a faithful "
            "attempt was not recoded as either fulfillment or breach."
        ),
    },
]


def main():
    results = []

    for case in CASES:
        graph_before = deepcopy(case["graph"])
        context_before = deepcopy(case["context"])
        graph_bytes_before = _stable_bytes(case["graph"])
        context_bytes_before = _stable_bytes(case["context"])

        receipt = reckon_stewardship(case["graph"], case["context"])

        assert _stable_bytes(case["graph"]) == graph_bytes_before
        assert _stable_bytes(case["context"]) == context_bytes_before
        assert case["graph"] == graph_before
        assert case["context"] == context_before

        for field, expected in case["expected"].items():
            actual = receipt[field]
            assert actual == expected, (
                f"{case['name']}: expected {field}={expected!r}, got {actual!r}"
            )

        rendered = render_meaning(receipt, case["graph"])
        if "meaning" in case:
            assert rendered == case["meaning"]

        results.append(
            {
                "case": case["name"],
                "receipt": receipt,
                "meaning": rendered,
            }
        )

    # Direct falsification gates: the same outcome can disagree with authority
    # and fidelity, while the same faithful act can remain unfulfilled.
    by_name = {result["case"]: result["receipt"] for result in results}
    assert by_name["delivered_outcome_unknown"] == {
        **by_name["delivered_outcome_unknown"],
        "authorization": "valid",
        "fidelity": "faithful",
        "fulfillment": "scope_uncertain",
    }
    assert by_name["child_eats_after_unauthorized_disclosure"] == {
        **by_name["child_eats_after_unauthorized_disclosure"],
        "authorization": "invalid",
        "fidelity": "breached",
        "fulfillment": "scoped_complete",
    }
    assert (
        by_name["graph_density_without_responsible_witness"]["fulfillment"]
        == "scope_uncertain"
    )

    print(json.dumps(results, indent=2, sort_keys=True, ensure_ascii=False))
    print(f"\n{len(results)} Covenant Circuit representative-carrier cases passed.")


if __name__ == "__main__":
    main()
