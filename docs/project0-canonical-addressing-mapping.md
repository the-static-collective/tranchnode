
## Domain Prefix Contradiction
Project0 implements a domain prefixing scheme (e.g., `Project0-Node-v1|`) that is prepended to the canonical JSON bytes *before* the SHA-256 digest is computed. TranchNode's `addressJson` function hashes the raw canonical JSON bytes directly. Because of this, while TranchNode strictly enforces the same canonical serialization bounds and rejection rules as Project0, the final computed hashes for accepted artifacts will fundamentally diverge. This incompatibility is enforced and proven in our test suite.
