# COLLECTIVE-005 — Privacy-Bounded Question Routing

**Status: experimental branch stacked on COLLECTIVE-004 (itself stacked on COLLECTIVE-003).** Not a deployed phone-to-phone network; no novel collective intelligence demonstrated.

## Question

Can a TranchNode installation choose **which approved peer to ask first**, using only source evidence voluntarily disclosed and locally admitted in the past, without querying another peer's private inventory?

## Implemented contract

- A pure local function computes the graph frontier using supported connections, excluding contested edges from its planning heuristic.
- Among existing approved, connected, signing-key-identified peers, prior signed sources near that frontier or destination raise the **suggestion score**. Unknown peers remain possible candidates. Forwarded duplicates carrying the same issuer and original source ID are counted once.
- Before suggesting, all imported source signatures and source bindings are independently rechecked.
- **Suggest peer** calculates ranking without contacting anyone. The human can choose and send the path-endpoint question to **one** peer, preview another candidate, or explicitly broadcast to all approved peers.
- Selected peers are validated atomically before transmission. An unapproved or unavailable target blocks the request without a partial fanout. Pending inquiry count is bounded.
- No peer automatically shares facts or adopts replies. Declining to answer never implies ignorance or falsehood. No private inventory is inferred.

## Reproduction

Node.js 22+, from repository root:

    node --test test/collective004-network.test.mjs test/collective005-routing.test.mjs
    node test/collective005-benchmark.mjs

GitHub Actions also checks JavaScript syntax and archives the synthetic benchmark output.

## Actual finite synthetic comparison

A deterministic benchmark creates **120 six-peer cases** per regime, hiding which peer holds the required next fact until after ordering. It compares routing against uniformly shuffled peer order, all-peer broadcast (6 recipients), and a clairvoyant one-recipient lower bound. This counts transmissions of *question labels*, not total information leakage, accuracy, computing cost, or WebRTC success.

| Synthetic regime | Router successful first contact | Random successful first contact | Mean recipients before helpful peer (router / random / broadcast) |
|---|---:|---:|---|
| Warm, a truthful relationship between historical sharing and later holdings | 120/120 | 17/120 | 1 / 3.758 / 6 |
| Cold, no relevant disclosed history | 27/120 | 17/120 | 3.208 / 3.758 / 6 |
| Misleading history, relevant-looking prior came from wrong peer | **0/120** | 17/120 | 3.433 / 3.758 / 6 |

**Interpretation:** Warm-start success is a property of the intentionally constructed synthetic regime, not evidence of generalized predictive ability. Misleading prior history *makes first contact worse than random*. The latter is an important falsifier: route scores cannot be treated as authority, and humans need explicit fallback.

A centrally pooled classical graph search with equivalent shared evidence still matches the final inference. This test concerns consented question routing and potential reduction in recipients, **not emergent intelligence superiority**.

## Limitations

No production encryption of stored history, verified real-human identities, full canonical TranchNode ontology, native APK, public relay deployment, TURN traversal, Android-to-Android field test, actual model-driven MOTIF cartridge selection, or cross-domain demonstration is claimed. A peer can cultivate misleading prior history. No claim of automatic real-world observation or permission.

## Next falsifier

COLLECTIVE-006 should test independently authored hidden-information tasks, response receipts under explicit consent, blind peer selection vs random/cheap/familiarity/topic-summary baselines, adversarial history manipulation, failover without privacy leaks, and real HTTPS/WSS mobile field trials before seeking autonomous collective reasoning.
