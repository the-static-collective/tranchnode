# COLLECTIVE-004 — Living Network (bounded experiment)

**What exists:** A mobile-installable TranchNode-inspired web app with an **optional direct peer connection**. Participants enter the same **256-bit invitation room**, discover the other *room participants*, open a WebRTC DataChannel, verify a P-256 signing-key fingerprint, explicitly approve the peer, ask graph questions, and decide separately which self-authored assertions to answer with. The requester must review and admit each signed answer into their own append-only memory. This is direct connection with permission-controlled testimony, **not** autonomous swarm intelligence.

**What does not exist yet:** a deployed public relay or HTTPS app from this branch, a native APK, public discovery/search, TURN support, offline network sync, encrypted persistent backups, verifiable human identity, full TranchNode kernel, full MOTIF reasoning cartridges, permission revocation after copying, or evidence that collective reasoning beats centralized algorithms given equivalent information.

## Stack

- **PWA** in `app/`: IndexedDB + WebCrypto + local deterministic ledger; unchanged offline/manual JSON export remains available.
- **Room discovery and signaling** in `relay/server.py`: ephemeral memory-only Python aiohttp WebSocket relay, `GET /health` and `GET /signal`. It sees room membership, signaling metadata (including ICE addresses), **not** graph questions or signed evidence. No persistent storage or message forwarding other than WebRTC offers/answers/ICE. Up to eight participants per room, 128 rooms, bounded frames and signaling rates; no public room listing. An invitation link in a URL fragment keeps the room token out of the static app's HTTP request, but the signaling server receives it when joining.
- **Direct WebRTC** in `app/network.mjs`: DTLS-encrypted data channel carrying signed room/session-bound identity handshake, approved inquiries and signed evidence. Room entry itself does not authorize messages. Every independently authenticated peer must be explicitly approved in each session; verify fingerprint via another channel when identity matters.
- **Witness exchange**: incoming inquiry does not disclose facts; users select claims to share or decline; receivers explicitly review and admit. No automatic evidence broadcasting, no transitive republishing.
- **MOTIF**: only bounded graph reachability; provenance depends on assertions, and contradictions are retained.

## Local two-node demonstration

Two terminal windows, from this directory:

    python3 -m pip install -r relay/requirements.txt
    TRANCH_ALLOWED_ORIGINS=http://127.0.0.1:8000,http://localhost:8000 python3 relay/server.py

    python3 -m http.server 8000 --bind 127.0.0.1 --directory app

Open `http://127.0.0.1:8000/` in **two isolated browser profiles** (or different devices connecting to a hosted HTTPS app). Both profiles must have different signing keys. In A, press **Create room**, copy the invitation link; in B open the invite and **Join room**. On A **Connect**, and on both verify fingerprints and **Approve session**. A records `A→B`; B records `B→C`. In A investigate `A→C` (UNKNOWN), press **Ask approved peers**; B gets an inquiry, selects `B→C`, presses **Share selected**; A receives a signed evidence card, previews it and **Admits**. Investigate `A→C` again to see the provenance-linked path. No JSON file needs to be transferred.

Note: `http://localhost`/`127.0.0.1` in this example means *each device itself*. Phones must use HTTPS for their PWA and a WSS signaling relay at a publicly reachable location. A local relay alone is not sufficient for phones on separate networks. On restrictive mobile networks, WebRTC can require a TURN service, **not yet supported in this prototype**. STUN may be configured in the UI (default `stun:stun.cloudflare.com:3478`); that service sees network IP metadata. Leave blank to avoid third-party STUN, generally limiting connectivity to local networks.

## Production-like relay deployment (NOT done)

Deploy `relay/Dockerfile` on Railway, Modal, or a server that supports long-lived WSS connections. Configure `TRANCH_ALLOWED_ORIGINS` as the **exact HTTPS PWA origin** (not wildcard); configure `PORT` and `BIND=0.0.0.0` if needed. Terminate TLS upstream and supply a `wss://.../signal` URL to the app. Never deploy a public relay with unrestricted origins or with confidential evidence in this research build. The relay does not perform account authentication; the invitation capability is the access secret, and anyone given it can appear in that room.

## Verification and falsifiers

    node --test tests/net.test.mjs
    python -m pytest -q tests/test_relay.py
    node --check app/app.mjs
    node --check app/network.mjs
    node --check app/net-protocol.mjs
    node --check app/network-ui.mjs

The tests cover signed identity bound to room and per-connection sessions, selective evidence disclosure, rejection of unapproved or unsolicited questions/answers, no hidden facts in responses, source-local inference and signed ancestry, relay discovery/forwarding, origin and cross-room isolation. The test of real WebRTC establishment and Android installation across the public internet is **not yet completed**; code and in-memory protocol tests cannot substitute for that evidence.

## Risk and epistemic posture

The signaling room code is a bearer capability. It is not an identity and may be forwarded. A WebRTC encryption layer protects data in transit once established, but room membership and endpoint addresses are exposed to the signaling relay; participants may see each other's network addresses. The local key is non-extractable from WebCrypto but browser-profile storage may be lost, and future same-origin script updates can request signing. Signed assertions remain assertions; signatures do not prove truth. There are no external witnesses, cryptographic revocation, third-party security audit, or production consent system. Use test statements only.

## Next falsifier

COLLECTIVE-005: prove connections between physical Android devices via HTTPS/WSS; audit and replace provisional TranchNode event semantics; integrate MOTIF proof-cartridge exchange; add explicit user-controlled encrypted identity/pin rotation, minimal relevant-peer query routing and a genuine equal-evidence/equal-compute multi-node benchmark. No performance or intelligence advantage has been established by this slice.
