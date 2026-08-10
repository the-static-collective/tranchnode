# Stigmergic Field v0.1 — Linked Vertical Design

Date: 2026-08-10
Status: approved design, pending implementation plan
Canonical implementation owner for the primitive: TranchNode
Downstream proof consumer: Band Runtime
Human-readable field notebook: What-is-the-static-collective-

## 1. Purpose

Prove that a shared substrate can communicate its current condition through deterministic, attributable, non-authoritative environmental traces, and that multiple sovereign participants can use those traces to redistribute activity without a central scheduler.

The bee observation is inspiration, not ontology. The implementation target is stigmergic coordination: useful behavior emerging because participants can sense changes in a shared field rather than because a coordinator assigns work.

The linked vertical has three surfaces:

1. **TranchNode** derives replay-stable field state from accepted evidence.
2. **Band Runtime** consumes that field inside a bounded encounter and proves coordinatorless redistribution.
3. **What-is-the-static-collective-** preserves the portable pattern, origin observation, specimen, and verdict without becoming canonical implementation authority.

Project0 is deliberately not changed in v0.1. If the specimen succeeds, a later Project0 proposal may extract only the law that has actually been demonstrated.

## 2. Governing invariant

> The substrate may describe pressure, residue, attraction, inhibition, latency, or tension without any derived condition becoming authority over history or participants.

Consequences:

- field state is a projection, never an accepted fact merely because it was derived;
- source events are immutable and remain the only historical basis for the projection;
- participants may ignore field conditions;
- inhibition reduces recruitment pressure but cannot delete, forbid, or rewrite source material;
- no hidden global chooser, assignment service, or consensus engine may be introduced to make the specimen succeed;
- inaccessible scope material contributes nothing and cannot be inferred through counts, magnitudes, fingerprints, sequence gaps, or timing;
- wall-clock time does not affect field decay or durable ordering.

## 3. Repository boundaries

### 3.1 TranchNode owns

- the generic stigmergic field data contract;
- deterministic event-distance decay;
- aggregation and canonical ordering;
- field fingerprints;
- validation rules;
- conformance fixtures and expected outputs;
- the rule that field output carries `authority: "none"`.

TranchNode does **not** own Band Runtime event semantics. It must not know what a clip, recognition, protected silence, or participant means.

### 3.2 Band Runtime owns

- a versioned adapter from accepted Band Runtime events to generic field traces;
- which runtime events emit attention, receptivity, saturation, inhibition, tension, or return signals;
- the coordinatorless encounter specimen;
- participant-visible use of field state;
- proof that runtime sovereignty, refusal, protected silence, projection, and replay laws remain intact.

Band Runtime does not redefine TranchNode field math.

### 3.3 What-is-the-static-collective- owns

- the origin note and bee analogy;
- the portable `stigmergic-field` pattern;
- the specimen narrative and human verdict;
- links to canonical implementation PRs and machine receipts;
- unresolved questions that should not yet become Project0 law.

The notebook is descriptive and mnemonic, not canonical over TranchNode or Band Runtime.

## 4. TranchNode contract

### 4.1 No ontology expansion

v0.1 does not add TranchNode node kinds, edge kinds, epistemic states, or accepted operations. It is implemented as a deterministic projection layer beside the existing projection machinery.

### 4.2 Generic source envelope

The field engine receives already-accepted, scope-bounded source events through a small generic envelope. Domain adapters are responsible for producing this envelope from their own accepted history.

```ts
interface FieldSourceEvent {
  eventId: string;
  scopeId: string;
  sequence: number;
}
```

`sequence` is the **scope-local accepted-event sequence** for `scopeId`, using the same causal ordering rule as the source system. It must not be a global cross-scope counter. `throughSequence` uses that same scope-local sequence domain.

This is the only decay clock. Wall-clock timestamps, arrival order, database row order, global activity elsewhere, and model output order are irrelevant.

### 4.3 Generic trace

A deterministic domain adapter may derive zero or more traces from an accepted source event.

```ts
type FieldChannel =
  | "attention"
  | "receptivity"
  | "saturation"
  | "inhibition"
  | "tension"
  | "return";

interface FieldTrace {
  sourceEventId: string;
  sourceSequence: number;
  scopeId: string;
  subjectRef: string;
  channel: FieldChannel;
  magnitude: number;
  decayWindowEvents: number;
}
```

Validation:

- `magnitude` is an integer from 0 through 1000;
- `decayWindowEvents` is an integer from 1 through 10000;
- `sourceSequence` is a positive safe integer;
- every trace must name an accepted source event in the same scope and must exactly match its scope-local sequence;
- `subjectRef` is opaque to TranchNode and must be non-empty;
- traces have **no caller-supplied identity**: each trace is content-addressed from its canonical body, and repeated identical trace hashes collapse idempotently;
- adapters may not emit traces from inaccessible events.

### 4.4 Event-distance decay

For projection causal cut `throughSequence`, trace age is:

```text
age = throughSequence - sourceSequence
```

A trace is inactive when `age >= decayWindowEvents`.

For an active trace:

```text
remaining = decayWindowEvents - age
effectiveMagnitude = floor(magnitude * remaining / decayWindowEvents)
```

All arithmetic is integer arithmetic with safe-integer checks. This avoids floating-point drift and makes replay stable across runtimes.

A trace with `sourceSequence > throughSequence` is invalid for the requested projection.

### 4.5 Aggregated field state

The engine groups active contributions by `(subjectRef, channel)` and returns both aggregate pressure and attributable contributors.

```ts
interface FieldContribution {
  traceHash: string;
  sourceEventId: string;
  sourceSequence: number;
  effectiveMagnitude: number;
}

interface FieldCell {
  subjectRef: string;
  channel: FieldChannel;
  totalEffectiveMagnitude: number;
  contributions: FieldContribution[];
}

interface StigmergicFieldProjection {
  schemaVersion: "stigmergic-field/v0.1";
  scopeId: string;
  throughSequence: number;
  policyVersion: string;
  adapter: { id: string; version: string };
  authority: "none";
  cells: FieldCell[];
  fingerprint: string;
}
```

Canonical ordering:

- cells sort by `subjectRef`, then channel;
- contributions sort by source sequence, source event id, then trace hash;
- aggregation uses checked integer addition and rejects overflow rather than wrapping or saturating silently.

Zero-magnitude contributions are omitted from returned cells.

### 4.6 Field fingerprint

The fingerprint is the TranchNode canonical address of the projection body excluding `fingerprint` itself.

It therefore binds at minimum:

- schema version;
- scope;
- scope-local causal cut;
- policy version;
- adapter identity/version;
- authority literal;
- canonical active cells and contributions.

Two participants with the same fingerprint can conclude only that they have the same declared stigmergic projection bytes. They may not infer broader semantic, identity, or authority equivalence.

### 4.7 Meaning of channels

The generic engine treats channel names as labels and does not infer domain semantics. The portable intended meanings are:

- `attention` — activity has recently concentrated here;
- `receptivity` — recent evidence indicates willingness/capacity to receive more activity;
- `saturation` — recent evidence indicates local load or diminishing need for more recruitment;
- `inhibition` — attributable evidence argues against increasing recruitment pressure;
- `tension` — unresolved friction, contradiction, or need remains active;
- `return` — participants have independently revisited or re-engaged this subject.

None means “do this,” “this is true,” or “this is resolved.”

## 5. Band Runtime adapter and specimen

### 5.1 Adapter boundary

Band Runtime implements an adapter with a fixed identity such as:

```text
band-runtime/stigmergic-adapter@0.1
```

The adapter maps only already-committed runtime events to traces. It does not read future events, model confidence, hidden participant state, or mutable UI state.

The adapter table must declare fixed integer magnitudes and decay windows as part of its versioned contract. v0.1 does not permit learned, probabilistic, or wall-clock-dependent weights.

The exact event-to-channel table is implementation-plan work, but v0.1 must include at least:

- one positive recruitment/attention source;
- one receptivity source;
- one saturation or interaction-latency-derived source;
- one explicit inhibitory/refusal source;
- one unresolved-tension source;
- one return/revisit source.

Latency-derived signals must be defined in scope-local accepted-event distance or another replay-stable event relation, not elapsed wall time.

### 5.2 Coordinatorless encounter

The proof fixture contains at least three sovereign participants and at least two candidate subjects/directions.

The fixture must create a sequence in which:

1. activity initially concentrates around subject X;
2. additional encounters make X saturated and/or inhibited;
3. subject Y remains comparatively under-attended and receptive;
4. at least one participant independently chooses Y after observing the field projection;
5. that choice is produced by a participant-local decision rule whose inputs are limited to that participant's allowed local state plus the visible field projection;
6. no event equivalent to `assign participant B to Y` exists;
7. protected silence and refusal remain legal participant outcomes;
8. replay from the same accepted sequence yields byte-identical field fingerprints at each asserted causal cut.

The participant action may be deterministic in the test fixture. The architectural proof is that its inputs are bounded local state plus non-authoritative field state, not a central assignment.

### 5.3 Anti-cheat condition

The specimen fails if useful redistribution depends on:

- a scheduler;
- a hidden ranking service;
- a single participant with global authority;
- mutation of prior events;
- an unreceipted model interpretation;
- wall-clock race timing;
- reading inaccessible participant/scope state.

## 6. Cross-repository conformance mechanism

TranchNode is currently a private package and Band Runtime does not depend on it as an npm package. v0.1 therefore links repositories through a versioned JSON fixture/contract rather than inventing packaging infrastructure.

TranchNode will publish a canonical fixture containing:

- source event envelopes;
- derived generic traces;
- projection request(s);
- expected active cells;
- expected fingerprints;
- a canonical fixture content hash/address.

Band Runtime will vendor the exact v0.1 fixture body under its own conformance fixtures, record the TranchNode fixture address it was copied from, and assert that its pinned fixture bytes still hash to that address before using it. Its adapter test then proves that accepted Band Runtime events produce the generic traces required by the pinned contract.

The copied fixture is conformance evidence, not a second authority: if the TranchNode fixture changes, it necessarily receives a new content address and Band Runtime must deliberately repin or remain on the previous contract.

If later work needs direct code reuse, package distribution can be designed separately. It is not part of this vertical.

## 7. Data flow

```text
accepted domain events
        |
        v
versioned deterministic domain adapter
        |
        v
generic FieldTrace[]
        |
        v
TranchNode stigmergic projection
  - validate
  - event-distance decay
  - aggregate
  - canonicalize
  - fingerprint
        |
        | authority = none
        v
participant-visible field state
        |
        v
sovereign local choice / refusal / silence
        |
        v
new accepted domain event
        |
        +-----------------------> replay loop
```

## 8. Error handling

TranchNode should use explicit typed errors/codes for at least:

- unsupported schema version;
- invalid or unsafe integer magnitude/window/sequence;
- source event missing;
- source sequence mismatch;
- scope mismatch;
- trace from the future relative to causal cut;
- arithmetic overflow;
- invalid/empty adapter identity or subject reference;
- projection identity/fingerprint mismatch when verifying a fixture.

Invalid input produces no partial field result.

Band Runtime adapter errors must fail the conformance/specimen test rather than silently dropping malformed accepted events that should have emitted a trace.

## 9. Testing strategy

### 9.1 TranchNode tests

Required tests:

1. same inputs + same causal cut => byte-identical projection/fingerprint;
2. input array permutation does not change projection;
3. decay is based on scope-local event distance, not timestamps;
4. trace expires exactly at its event window boundary;
5. multiple contributors aggregate while remaining attributable;
6. inhibition remains visible and never deletes positive traces;
7. future traces are rejected;
8. cross-scope traces are rejected;
9. unsafe numbers and overflow are rejected;
10. adapter id/version and policy version change the fingerprint;
11. inaccessible/omitted events contribute nothing and unrelated scopes cannot create visible sequence gaps;
12. canonical JSON fixture reproduces expected cells, fixture address, and projection fingerprint.

### 9.2 Band Runtime tests

Required tests:

1. adapter emits the expected generic traces from accepted events;
2. no unaccepted or future event contributes;
3. protected-silence/refusal events remain non-mutating except for attributable residue allowed by existing law;
4. coordinatorless fixture redistributes activity from X toward Y;
5. the participant choosing Y does so from local state plus visible field, with no assignment input;
6. removing field visibility prevents the fixture from claiming stigmergic coordination success;
7. inserting a central assignment causes an anti-cheat assertion failure;
8. replay produces the same sequence of asserted fingerprints and participant-visible field states;
9. the vendored TranchNode conformance fixture still matches its pinned canonical address.

### 9.3 Notebook specimen

Record:

- the initiating bee observation;
- evidence versus analogy;
- the primitive definition;
- implementation links;
- exact specimen setup;
- machine receipts/fingerprints;
- what participants could see at each important causal cut;
- human verdict: useful, fake, surprising, coercive, confusing, or genuinely coordination-enabling;
- remaining tensions and whether Project0 promotion is warranted.

## 10. Success criteria

The vertical succeeds only if all of the following hold:

1. TranchNode derives a deterministic field from attributable accepted evidence.
2. The field has no mutation or authority pathway.
3. Event-distance decay reproduces exactly under replay.
4. Band Runtime demonstrates useful activity redistribution with no central assignment.
5. Refusal and protected silence remain available.
6. Scope boundaries reveal no side-channel information, including through sequence numbering.
7. Machine receipts make the field evolution inspectable.
8. The notebook captures the portable law and specimen without claiming canonical authority.

The strongest proof statement v0.1 may make is:

> Multiple sovereign participants redistributed activity using shared, replayable environmental evidence without a central assignment, while every environmental condition remained attributable and non-authoritative.

It may not claim that stigmergy universally outperforms scheduling, that quorum equals truth, or that the bee analogy establishes software correctness.

## 11. Failure conditions

The vertical fails or must be redesigned if:

- field output changes when input ordering changes;
- replay changes decay or fingerprints;
- wall-clock timing changes durable meaning;
- aggregate pressure hides source attribution;
- inhibition suppresses source history;
- a participant is compelled by field state;
- hidden scope activity affects visible pressure, sequence gaps, or fingerprints;
- the specimen only works because a coordinator secretly performs allocation;
- Band Runtime must duplicate or reinterpret TranchNode field math;
- the abstraction requires a Project0 ontology change before the specimen can run.

## 12. Planned PR order

1. **TranchNode:** generic Stigmergic Field v0.1 projection + conformance fixture.
2. **Band Runtime:** versioned adapter + coordinatorless encounter specimen consuming the pinned v0.1 contract.
3. **What-is-the-static-collective-:** graduate the bee incubator into `patterns/stigmergic-field.md` and preserve `specimens/stigmergic-field-v0.1.md` with links and verdict.

The notebook PR should reference the merged or final implementation PRs. A Project0 proposal, if any, comes only after the specimen verdict.

## 13. Explicitly out of scope

- Project0 ontology changes;
- cross-scope bridges;
- reputation scores;
- agent ranking;
- consensus or quorum-as-truth;
- autonomous production scheduling;
- UI polish or visualization beyond what the proof needs;
- published npm packaging between TranchNode and Band Runtime;
- model-learned decay/magnitude rules;
- wall-clock decay;
- probabilistic field math;
- production tuning of channel weights.

## 14. Design decision

Proceed with the linked vertical on the boundary above. The first implementation target is the TranchNode generic field projection. Band Runtime follows only against the frozen v0.1 conformance contract, and the notebook records the result after the behavioral proof exists.
