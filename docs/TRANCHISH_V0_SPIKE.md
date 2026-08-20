# Tranchish v0 — human-speakable constitutional code language spike

**Status:** feasibility spike / frontier note  
**Issue:** #61  
**Implementation authority:** none  
**Seed utterance:** `open cellar door`

## Question

Can TranchNode support a language whose canonical forms are natural for a human to **say aloud** and strict enough for a machine to **parse deterministically**, while preserving the constitutional distinction that a representation of intent does not itself confer authority?

The experiment is not trying to make conventional code prettier, and it is not trying to let natural language drive arbitrary execution.

The target is narrower:

```text
human speech
    ↓
canonical Tranchish
    ↓
typed proposal
    ↓
separately constituted authority
    ↓
attempted consequence
    ↓
terminal receipt
```

The reverse direction matters equally:

```text
terminal receipt / history
    ↓
canonical Tranchish
    ↓
human-readable sentence
```

> **Anything the machine can execute should be possible for a human to say. Anything the machine has done should be possible for a human to read aloud.**

That sentence is a design target, not an implementation claim.

## Why TranchNode is the right place to incubate this

TranchNode already carries the laws this experiment must not weaken:

- models propose operations; the kernel validates them;
- inference does not become observation by confidence;
- decoded Intent Stroke evidence carries `authority: "none"`;
- candidate interpretation does not authorize crossing;
- durable changes preserve lineage rather than silently rewriting ancestors;
- Continuity Spine can describe and refuse a transition without executing it;
- Continuity Boundary Witness can classify an occurred transition without acquiring authority over it.

Tranchish should therefore begin as a **representation boundary**, not a power surface.

A sentence can be perfectly executable *in form* while remaining only a proposal *in authority*.

## Neighboring surfaces — and why this is not them

### Human Terminal

Human Terminal translates already-bounded application operations into basic human language. Its job is operator/navigation legibility: what can the House presently see, offer, explain, or hand off?

Tranchish is not a replacement for Human Terminal. The Human Terminal design explicitly avoids becoming a universal command language.

Tranchish asks a lower-level question:

> Can the representation itself be both speakable and canonical enough to round-trip between human utterance and typed constitutional state?

A future Human Terminal could choose to emit or accept canonical Tranchish, but neither surface should own the other's authority.

### Intent Stroke

Intent Stroke proves that approximate human traversal input can become deterministic candidate evidence without becoming authority.

Tranchish attempts the same constitutional posture for language:

```text
gesture != traversal authority
utterance != execution authority
```

### TRAEX / crossing grammar

TRAEX is a mnemonic/projection candidate for inspectable boundary crossings and their residue. Tranchish may eventually be able to *say* a TRAEX track, but it must not collapse distinct crossing operations into one generic verb merely to simplify grammar.

## Primordial fixture

```text
open cellar door
```

This replaces `Hello, World!` as the useful first pressure test because it asks the represented world to change.

The phrase is intentionally ordinary. It immediately forces unresolved questions into the open:

- Which cellar door?
- Is it presently closed?
- Is this a request, a prediction, a report, or an admitted act?
- Who is speaking?
- Does the speaker possess relevant authority?
- If authority exists, is it still spendable?
- Was an attempt made?
- Did the host perform the consequence?
- What was witnessed afterward?
- What receipt distinguishes refusal from failure from success?

The grammar succeeds only if those differences can remain explicit without making the language miserable to speak.

## First constitutional rule

> **Imperative mood proposes. It does not authorize.**

Canonical v0 should interpret:

```text
open cellar door
```

as conceptually equivalent to:

```text
proposal:
  action: open
  target: cellar-door
  authority: none
```

The exact typed shape is deliberately unfrozen in this spike.

The invariant is not.

No parser, model, microphone, UI, or caller may convert the grammatical force of an imperative into permission merely because it sounds like a command.

## Candidate grammar kernel

The first vocabulary should be intentionally small. New roots are useful only when they preserve a distinction that existing roots cannot express cleanly.

### Candidate action roots

```text
open
close
attach
detach
branch
join
name
adopt
propose
witness
infer
refuse
fail
spend
supersede
reconcile
```

These are provisional. They are included because each already carries a meaningful distinction in the current project family.

### Candidate relation words

```text
under    authority / warrant
from     provenance or source
to       relational target
at       position or address
as       declared role or type
because  explicit causal explanation
```

Canonical Tranchish should avoid syntax that depends on punctuation a human cannot naturally speak.

## Semantic classes that must not collapse

Tranchish v0 needs at least these distinct meanings even if the final grammar uses different surface forms.

### Proposal

```text
open cellar door
```

A desired or requested transition. World unchanged merely because the sentence is valid.

### Admitted transition

Conceptual candidate:

```text
cellar door may open under warrant ember seven
```

`may` is interesting because ordinary English already associates it with permission, but this syntax is **not frozen**. The spike must reject it if it proves semantically overloaded or awkward.

The invariant is that admission must name or resolve to separately constituted authority. The auxiliary itself cannot mint that authority.

### Witnessed consequence

Conceptual candidate:

```text
witness cellar door opened
```

A past-tense statement without witness/evidence may remain merely a claim. Canonical witness language should expose what observation or receipt supports the consequence.

### Refusal

```text
refuse open cellar door because warrant spent
```

Refusal means the proposed transition did not acquire a lawful path to consequence.

### Failure

```text
open cellar door failed because hinge blocked
```

Failure means an admitted/attempted consequence did not complete. It must not be flattened into refusal.

### Unresolved

```text
cellar door unresolved
```

The language should be able to say that a reference, parse, or semantic choice is not determined without inventing a resolution.

## One-way leniency

A useful normalization rule is:

> **Input may be generous. Output must be canonical.**

A human might say:

```text
could you open up the cellar door using ember seven
```

A Tranchish interpreter may normalize that sentence only if the available context yields exactly one canonical meaning.

If two valid parses remain, the correct result is not “best guess.” It is unresolved.

This creates a strict asymmetry:

```text
wild / ordinary input
      ↓ only when unambiguous
canonical Tranchish
```

Canonical output should never contain invisible semantic choices that the rendered sentence cannot expose.

## Wild Tranchish and Canonical Tranchish

A living language and an executable language want opposite things.

Living language benefits from mutation, jokes, compounding, local usage, semantic drift, and accidental coinage.

Executable language requires stable meanings and fail-closed ambiguity.

The experiment therefore keeps two membranes:

### Wild Tranchish

Humans may freely coin and mutate language.

Examples might include:

```text
deephaunt
inslice
ghost-attach
afterwitness
soft-open
```

Wild vocabulary can be meaningful, useful, and culturally alive without being executable.

### Canonical Tranchish

Only meanings that are precise enough to normalize deterministically may become canonical executable vocabulary.

A wild word may eventually acquire a stable mapping, alias, or first-class root. That adoption must be explicit. Frequency or model familiarity alone is insufficient.

> **The language may evolve freely. Execution may not.**

A future dictionary should therefore witness usage rather than automatically legislate executable meaning.

## Cellar Door test matrix

Every Tranchish implementation candidate should survive the same small fixture family.

### 1. No authority

```text
open cellar door
```

Expected: valid proposal; world unchanged.

### 2. Valid separately constituted authority

A canonical sentence names a currently valid warrant/capability.

Expected: language can represent admission, but the owning runtime still performs the actual authority check and consequence.

### 3. Spent or invalid authority

Expected: explicit refusal; no fabricated output or consequence.

### 4. Unknown referent

Multiple or missing cellar doors.

Expected: unresolved; no guessed target.

### 5. Host/destination failure

Authority was valid and an attempt occurred, but the host failed.

Expected: failure history remains distinct from refusal and success.

### 6. Already-open state

The target may already be open.

Expected: preserve whether that fact was known before admission or discovered only during attempted execution. Equal final state does not imply equal history.

### 7. Ambiguous ordinary-language input

Two canonical parses remain plausible.

Expected: unresolved; no model-selected winner without an independently defined disambiguation rule.

### 8. Receipt return

Given terminal structured history, render canonical Tranchish.

Expected: a human can read the history aloud without losing refusal/failure/success, authority provenance, or unresolved state.

## Round-trip constraint

The strongest form of the experiment would satisfy:

```text
canonical sentence
    -> typed structure
    -> canonical sentence
```

without changing meaning, and:

```text
terminal receipt
    -> canonical sentence
    -> typed receipt projection
```

without inventing hidden fields.

Not every underlying machine field must literally be packed into one sentence. A sentence may name an addressed warrant, receipt, or object whose details live elsewhere. But every semantic distinction that changes how the sentence is interpreted must be externally inspectable and human-renderable.

## Candidate syntax to reject early

The spike should actively search for attractive failures.

Reject a form if it requires any of these:

- imperative mood to imply permission;
- model confidence as a substitute for deterministic parse resolution;
- silent default target selection;
- hidden authority inherited from transport, microphone, UI, or caller;
- punctuation-only semantics that cannot be spoken;
- receipt fields whose material meaning cannot be rendered back to human language;
- a vocabulary so rigid that ordinary compounds cannot form outside the executable membrane;
- a vocabulary so loose that canonical terms drift without explicit adoption.

## Smallest next experiment

Do not build a production parser yet.

The next useful proof is a fixture-backed paper/parser spike over perhaps 6–10 canonical sentences covering the Cellar Door matrix.

For each sentence, record:

```text
utterance
canonical_form
parse_status
semantic_class
action
target
authority_ref
provenance_refs
expected_world_effect
terminal_class
canonical_return_sentence
residual_unresolved
```

Then test two properties:

1. **Speakability:** a human can naturally say and understand the canonical sentence.
2. **Determinacy:** independent parsers/readers given the same declared context reach the same typed interpretation or the same unresolved result.

Only after that should an executable parser or cross-project protocol be proposed.

## Non-goals

This spike does not establish:

- a universal Static Collective command language;
- a replacement for Human Terminal, Garden, Intent Stroke, or donor-owned application contracts;
- free-form LLM-to-shell execution;
- voice identity or ambient microphone authority;
- automatic crossing;
- destination admission;
- a new Project0 ontology;
- a second canonicalizer or identity system;
- a requirement that wild vocabulary be executable;
- an AI model as the final parser authority;
- legal validity;
- production grammar stability.

## Graduation evidence

Tranchish deserves a real implementation design only if the spike can show all of the following at once:

1. `open cellar door` and several harder sentences remain natural enough to speak.
2. Canonical sentences map deterministically to explicit typed meanings or explicit unresolved results.
3. Imperative language never bypasses existing authority boundaries.
4. Refusal, failure, success, and unresolved history survive round-trip rendering.
5. At least one ordinary-language variant can normalize safely.
6. At least one plausible variant is deliberately refused as ambiguous.
7. Wild vocabulary can remain alive without silently mutating executable semantics.
8. The experiment composes with TranchNode's current laws instead of introducing a parallel authority or identity system.

Until then, Tranchish is an incubated language hypothesis.

## Governing compression

> **Speakable code. Readable receipts. Representation is not authority.**

And the first words remain:

```text
open cellar door
```
