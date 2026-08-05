#!/usr/bin/env python3
"""Executable fixture for the Projection Covenant acceptance gate.

Run directly:
    python fixtures/projection-covenant/01-citable-without-disclosure/evaluate.py

No canonical ontology or event kinds are introduced here. The fixture-local
profiles exist only to prove that reception, local effect, carrying, and
transmission authority remain independent judgments.
"""

from copy import deepcopy
import json


DISCLOSURE_LEVEL = {
    "none": 0,
    "existence_only": 1,
    "approved_metadata": 2,
    "approved_summary": 3,
    "full_content": 4,
}


def evaluate_projection(covenant, act):
    """Return a receipt without mutating either input."""
    reception = (
        "valid"
        if covenant["receptionGrant"]["encounter"]
        and act["received"]
        and act["lineageUnderstood"]
        else "invalid"
    )

    allowed_citation = covenant["receptionGrant"]["cite"]
    requested_disclosure = act["citation"]["disclosed"]
    disclosure_within_bounds = (
        DISCLOSURE_LEVEL[requested_disclosure]
        <= DISCLOSURE_LEVEL[allowed_citation]
        and not act["citation"]["includesProtectedContent"]
    )

    witness_claim = (
        "appropriated" if act["citation"]["claimsWitness"] else "not_claimed"
    )

    citation_authorized = (
        reception == "valid"
        and allowed_citation != "none"
        and disclosure_within_bounds
        and witness_claim == "not_claimed"
        and not act["citation"]["claimsAdoption"]
    )

    content_retransmission_authorized = (
        act["contentRetransmission"]
        and covenant["receptionGrant"]["republishContent"]
        and disclosure_within_bounds
    )

    return {
        "stages": {
            "received": act["received"],
            "affected": act["localResidue"],
            "carried": act["carried"],
            "transmissible": {
                "citation": citation_authorized,
                "content": content_retransmission_authorized,
                "delegation": covenant["receptionGrant"]["delegate"],
            },
        },
        "reception": reception,
        "adoption": act["adoption"],
        "citation": "authorized" if citation_authorized else "unauthorized",
        "contentRetransmission": (
            "authorized" if content_retransmission_authorized else "unauthorized"
        ),
        "disclosure": "within_bounds" if disclosure_within_bounds else "enlarged",
        "witnessClaim": witness_claim,
        "semanticEffect": "local_only",
        "foreignnessPreserved": (
            act["adoption"] == "none"
            and not act["citation"]["claimsAdoption"]
            and witness_claim == "not_claimed"
        ),
    }


COVENANT = {
    "id": "C1",
    "sourceNode": "A",
    "testimonyRef": "T1",
    "disclosure": "bounded",
    "receptionGrant": {
        "encounter": True,
        "cite": "existence_only",
        "contest": True,
        "carryLocally": False,
        "deriveTestimony": False,
        "republishContent": False,
        "delegate": False,
    },
    "authority": "self_only",
}

NODE_B_ACT = {
    "receiver": "B",
    "received": True,
    "lineageUnderstood": True,
    "localResidue": True,
    "adoption": "none",
    "carried": False,
    "citation": {
        "disclosed": "existence_only",
        "includesProtectedContent": False,
        "claimsWitness": False,
        "claimsAdoption": False,
    },
    "contentRetransmission": False,
}

EXPECTED = {
    "stages": {
        "received": True,
        "affected": True,
        "carried": False,
        "transmissible": {
            "citation": True,
            "content": False,
            "delegation": False,
        },
    },
    "reception": "valid",
    "adoption": "none",
    "citation": "authorized",
    "contentRetransmission": "unauthorized",
    "disclosure": "within_bounds",
    "witnessClaim": "not_claimed",
    "semanticEffect": "local_only",
    "foreignnessPreserved": True,
}


def main():
    covenant_before = deepcopy(COVENANT)
    act_before = deepcopy(NODE_B_ACT)

    actual = evaluate_projection(COVENANT, NODE_B_ACT)

    assert actual == EXPECTED, (actual, EXPECTED)
    assert COVENANT == covenant_before, "evaluator mutated covenant input"
    assert NODE_B_ACT == act_before, "evaluator mutated receiver input"

    assert actual["stages"] == {
        "received": True,
        "affected": True,
        "carried": False,
        "transmissible": {
            "citation": True,
            "content": False,
            "delegation": False,
        },
    }

    print(json.dumps(actual, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
