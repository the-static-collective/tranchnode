# TranchNode as a Coherence Substrate

Status: **meaning-contract proposal**

Branch: `coherence-substrate`

## The deeper problem

TranchNode is not merely a memory substrate.

Memory is necessary, but memory alone can preserve a perfect record of drift.

The deeper problem is:

> **How does identity survive growth?**

TranchNode exists to help a person, project, community, institution, creative body, or agent remain recognizably itself while continuing to unfold.

That requires memory, provenance, boundaries, participation, interpretation, and drift detection to work together.

## Governing definition

> **Coherence is the ability of a thing to remain recognizably itself while changing.**

Coherence is not stasis.

A coherent thing may learn, repent, branch, mature, absorb contradiction, retire prior forms, and become more capable. It remains coherent when those changes preserve an inspectable relationship to its governing identity and history.

## Faithfulness

Faithfulness is not simple repetition, uptime, predictability, or compliance with a static specification.

A useful design heuristic is:

> **Faithfulness is participation sustained through repetition under coherent constraint.**

Consistency is not best modeled as an independent variable beside participation and repetition. It is the quality of their coupling.

- Participation without repetition becomes an isolated event.
- Repetition without genuine participation becomes automation or empty ritual.
- Regularity without coherent constraint becomes predictable drift.
- Participation repeated under a legible constraint can become faithfulness.

Faithfulness is recognized retrospectively, after a pattern has persisted long enough to outrun noise.

## Drift

The structural opposite of faithfulness is not mere failure or absence.

It is **drift**.

Drift occurs when activity continues but the governing constraint silently changes.

The system still runs. People still participate. Events continue to accumulate. Yet the character of the thing becomes less legible or materially different without an explicit, attributable transformation.

This makes drift more dangerous than obvious breakage. Breakage announces itself. Drift often inherits the language, interfaces, rituals, and authority of the thing it has ceased to be.

## Faithfulness as active resistance to drift

Faithfulness does not mean resistance to change.

It means resistance to **unwitnessed identity diffusion**.

A tree changes continuously without drifting into a river. A project may change architecture without abandoning its mission. A trust may adapt its methods without redirecting its purpose. A radio station may grow new voices without becoming an advertising machine.

The question is not:

> Did this remain unchanged?

The question is:

> Can the transformation be traced, understood, and reconciled with the identity this thing claims to continue?

## Relationship and duration

> **Relationship densifies meaning across presence. Faithfulness densifies meaning across duration.**

Together they generate a field in which presence and duration become generative rather than consumptive.

Relationship lets small observations decompress through their connections.

Faithfulness lets small acts decompress through time.

One event reveals little. A long sequence of coherently related acts begins to reveal character.

## Character legibility

A system should not be considered trustworthy merely because it satisfies a specification or remains available.

A stronger test is:

> **After a thousand interactions under varying conditions, can a newcomer still read what this thing is?**

Character becomes legible when behavior remains coherent across:

- scarcity and abundance;
- low and high participation;
- hostility and cooperation;
- success and failure;
- routine and emergency;
- leadership changes;
- interface and model replacement;
- pressure to optimize for metrics that conflict with purpose.

## Core responsibilities of a coherence substrate

TranchNode should support at least the following functions.

### 1. Identity contracts

A thing may declare its purpose, boundaries, invariants, authorities, and permitted modes of change.

These declarations are versioned and attributable. They are not treated as immutable truth, but changes to them must be explicit.

### 2. Lineage

Significant forms preserve inspectable ancestry.

Replacement must not silently masquerade as continuation. Branching, supersession, repudiation, repair, and inheritance should remain distinguishable.

### 3. Provenance

Claims, artifacts, interpretations, and decisions retain their sources and transformation history.

Retrieval is not authority. Confidence is not evidence. Repetition is not verification.

### 4. Boundary preservation

Private drafts, scoped disclosures, delegated authority, and role-limited contexts must not leak merely because integration is convenient.

Coherence without boundaries becomes absorption.

### 5. Participation receipts

The system records meaningful entry into relationship: offers, needs, witnesses, responses, transfers, refusals, repairs, and fulfilled commitments.

Clicks and impressions are not automatically participation.

### 6. Transformation receipts

When a thing changes, the system should record:

- what changed;
- who or what authorized it;
- what evidence or pressure motivated it;
- what prior identity contract it affects;
- whether the change is amendment, branching, repair, repudiation, or drift candidate;
- what remains continuous.

### 7. Drift detection

The system may compare declared identity with accumulated behavior and surface possible incoherence.

It must not silently pronounce moral judgment or rewrite identity. It should produce inspectable drift candidates for human or authorized review.

### 8. Repair paths

Coherence is not maintained by hiding contradiction.

The substrate should support confession, correction, restitution, retirement, reconciliation, and explicit re-founding where appropriate.

A repaired lineage is stronger than a falsified seamless history.

## Drift candidate model

```ts
export type DriftCandidate = {
  id: string;
  subjectNodeId: string;
  identityContractVersionId: string;
  observedEventIds: string[];
  observedRelationIds: string[];
  dimension:
    | "purpose"
    | "authority"
    | "boundary"
    | "disclosure"
    | "participation"
    | "allocation"
    | "tone"
    | "behavior"
    | "lineage";
  summary: string;
  evidence: string[];
  confidence?: number;
  status:
    | "candidate"
    | "acknowledged"
    | "explained"
    | "accepted_change"
    | "repairing"
    | "resolved"
    | "rejected";
  createdAt: string;
};
```

A confidence score expresses model uncertainty only. It does not determine disposition.

## Coherence review questions

For any project, trust, community, agent, or institution:

1. What does this thing claim to be?
2. Which constraints make that identity legible?
3. What forms of change are authorized?
4. What behavior has actually repeated?
5. Under which conditions did behavior change?
6. Is the change explicit and attributable?
7. What remains continuous?
8. What has been lost, contradicted, or silently replaced?
9. Is this maturation, branching, repair, or drift?
10. Who has authority to decide, and whose witness must not be erased?

## Design implications

### Do not optimize only for event volume

More participation events can accelerate incoherence if the governing constraint is weak or unclear.

### Do not scale repetition before meaningful participation exists

Automating a ritual before people have genuinely entered the relationship produces empty regularity.

### Do not confuse consistency with sameness

A coherent system can vary its expression while preserving its stance.

### Do not treat declared values as proof of character

Character is inferred from accumulated behavior under pressure.

### Do not let models become invisible legislators

Models may detect patterns and propose drift candidates. They may not silently redefine the identity contract they evaluate.

### Preserve credible childhoods

Systems may begin incomplete and learn in public. Their development should remain traceable so growth becomes part of their identity rather than an embarrassment to conceal.

## Applications across the field

- **Static Collective Radio:** Does the station remain hospitable, attentive, strange, and non-extractive as it gains listeners and automation?
- **Nourish Kids:** Does repeated distribution preserve dignity and nourishment, or drift toward surveillance, promotion, or donor theater?
- **BananaSpork:** Does field capture remain subordinate to human participation and privacy, or become an engagement machine?
- **Trust structure:** Do assets and decisions continue serving the declared purpose under changing stewards and conditions?
- **The Autodiscography:** Does expansion preserve honest relation to lived experience without flattening every work into branding?
- **TranchNode itself:** Does the substrate preserve plurality, lineage, and bounded authority, or become an omniscient central narrator?

## Minimum coherence slice

A first executable slice should:

1. Define one versioned identity contract for a project.
2. Ingest a sequence of attributable events and decisions.
3. Preserve their lineage and governing context.
4. Evaluate one declared coherence dimension.
5. Produce a drift candidate with explicit evidence.
6. Require an authorized disposition rather than automatic judgment.
7. Record amendment, explanation, repair, acceptance, or rejection.
8. Re-run the evaluation against the new state without erasing the earlier result.

## Acceptance invariants

- Change is not classified as drift merely because it is novel.
- Repetition is not classified as faithfulness merely because it is regular.
- Model confidence never substitutes for evidence or authority.
- Identity contracts are versioned rather than overwritten.
- Drift candidates cite inspectable behavior.
- Human or delegated dispositions remain attributable.
- Contradiction and repair remain visible in lineage.
- A project can branch without falsely claiming singular continuity.
- No central coherence score reduces the subject to one number.
- The substrate itself remains replaceable without erasing the preserved meaning contract.

## Canon compression

> **TranchNode helps identity survive growth.**

Memory preserves what happened.

Lineage preserves how forms relate.

Boundaries preserve rightful distinction.

Participation reveals lived reality.

Faithfulness makes character legible across duration.

Drift detection reveals when continued activity no longer coheres with the identity being claimed.

Together these functions make TranchNode a coherence substrate.
