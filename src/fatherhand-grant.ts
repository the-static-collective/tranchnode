export type RootCapacityBasis =
  | "inherent"
  | "created"
  | "entrusted"
  | "consented"
  | "custodial"
  | "contracted"
  | "necessity"
  | "indeterminate";

export type PurposeRelation =
  | "origin"
  | "identical"
  | "narrows"
  | "operationalizes"
  | "preserves"
  | "expands"
  | "reinterprets"
  | "replaces";

export interface PurposeLinkV01 {
  purposeId: string;
  parentPurposeId: string | null;
  relation: PurposeRelation;
}

export interface CapabilityExtinguishmentV01 {
  capability: string;
  effectiveAt: string;
  ref: string;
}

export interface FatherhandGrantV01 {
  schema: "tranchnode/fatherhand-grant/v0.1";
  id: string;
  parentGrantId: string | null;
  fatherhandId: string;
  grantorId: string;
  granteeId: string;

  capabilities: string[];
  scopeRefs: string[];
  purpose: PurposeLinkV01;

  transferable: boolean;
  delegableCapabilities: string[];
  delegableScopeRefs: string[];

  retainedCapabilities: string[];
  extinguishments: CapabilityExtinguishmentV01[];

  issuedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  revocationRef?: string;

  parentSeal?: string;
  seal: string;

  rootCapacityBasis?: RootCapacityBasis;
  rootCapacityBasisRef?: string;
}

export interface FatherhandActRequirementV01 {
  capability: string;
  scopeRefs: string[];
  purposeId: string;
}

export type FatherhandFailureCode =
  | "duplicate_grant_id"
  | "missing_terminal_grant"
  | "missing_parent_grant"
  | "cycle"
  | "fatherhand_mismatch"
  | "grantor_discontinuity"
  | "parent_seal_mismatch"
  | "root_shape_invalid"
  | "child_shape_invalid"
  | "capability_enlargement"
  | "scope_enlargement"
  | "delegation_enlargement"
  | "nontransferable_parent"
  | "extinguished_parent_capability"
  | "revoked_chain"
  | "expired_chain"
  | "expiry_enlargement"
  | "purpose_discontinuity"
  | "purpose_transformation"
  | "required_capability_missing"
  | "required_scope_missing"
  | "required_purpose_mismatch"
  | "terminal_capability_extinguished"
  | "invalid_time";

export interface FatherhandFailure {
  code: FatherhandFailureCode;
  grantId: string;
  detail: string;
  refs: string[];
}

export interface AuthorityValidationReceiptV01 {
  schema: "tranchnode/fatherhand-authority-validation-receipt/v0.1";
  terminalGrantId: string;
  fatherhandId: string | null;
  chain: string[];
  required: FatherhandActRequirementV01;
  result: "valid" | "invalid" | "indeterminate";
  failures: FatherhandFailure[];
  uncertainties: string[];
  evaluatedAt: string;
  evaluatorVersion: "fatherhand-grant-validator/v0.1";
  nonClaims: string[];
}

const ALLOWED_CHILD_PURPOSE_RELATIONS = new Set<PurposeRelation>([
  "identical",
  "narrows",
  "operationalizes",
  "preserves",
]);

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function subset(child: readonly string[], parent: readonly string[]): string[] {
  const allowed = new Set(parent);
  return uniqueSorted(child.filter((value) => !allowed.has(value)));
}

function instant(value: string): number | null {
  if (!nonEmpty(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function effectiveAtOrBefore(value: string | undefined, comparison: number): boolean {
  if (!value) return false;
  const parsed = instant(value);
  return parsed !== null && parsed <= comparison;
}

function sortFailures(failures: FatherhandFailure[]): FatherhandFailure[] {
  return [...failures]
    .map((failure) => ({ ...failure, refs: uniqueSorted(failure.refs) }))
    .sort((a, b) =>
      a.code.localeCompare(b.code) ||
      a.grantId.localeCompare(b.grantId) ||
      a.detail.localeCompare(b.detail) ||
      a.refs.join("\u0000").localeCompare(b.refs.join("\u0000"))
    );
}

function failure(
  code: FatherhandFailureCode,
  grantId: string,
  detail: string,
  refs: string[] = [],
): FatherhandFailure {
  return { code, grantId, detail, refs };
}

function validateGrantLocalShape(grant: FatherhandGrantV01, failures: FatherhandFailure[]): void {
  const requiredStrings = [
    ["id", grant.id],
    ["fatherhandId", grant.fatherhandId],
    ["grantorId", grant.grantorId],
    ["granteeId", grant.granteeId],
    ["seal", grant.seal],
    ["purpose.purposeId", grant.purpose?.purposeId],
  ] as const;

  for (const [field, value] of requiredStrings) {
    if (!nonEmpty(value)) failures.push(failure("child_shape_invalid", grant.id || "<missing>", `${field} must be non-empty`, [field]));
  }

  if (grant.schema !== "tranchnode/fatherhand-grant/v0.1") {
    failures.push(failure("child_shape_invalid", grant.id || "<missing>", "unsupported grant schema"));
  }

  const issued = instant(grant.issuedAt);
  if (issued === null) failures.push(failure("invalid_time", grant.id, "issuedAt must be a valid instant", [grant.issuedAt]));

  if (grant.expiresAt && instant(grant.expiresAt) === null) {
    failures.push(failure("invalid_time", grant.id, "expiresAt must be a valid instant", [grant.expiresAt]));
  }
  if (grant.revokedAt && instant(grant.revokedAt) === null) {
    failures.push(failure("invalid_time", grant.id, "revokedAt must be a valid instant", [grant.revokedAt]));
  }
  if (grant.revokedAt && !nonEmpty(grant.revocationRef)) {
    failures.push(failure("child_shape_invalid", grant.id, "revokedAt requires revocationRef"));
  }

  const capOutsideHeld = subset(grant.delegableCapabilities, grant.capabilities);
  if (capOutsideHeld.length > 0) {
    failures.push(failure(
      "delegation_enlargement",
      grant.id,
      "delegableCapabilities must be a subset of capabilities",
      capOutsideHeld,
    ));
  }

  const scopeOutsideHeld = subset(grant.delegableScopeRefs, grant.scopeRefs);
  if (scopeOutsideHeld.length > 0) {
    failures.push(failure(
      "delegation_enlargement",
      grant.id,
      "delegableScopeRefs must be a subset of scopeRefs",
      scopeOutsideHeld,
    ));
  }

  const retainedOutsideHeld = subset(grant.retainedCapabilities, grant.capabilities);
  if (retainedOutsideHeld.length > 0) {
    failures.push(failure(
      "child_shape_invalid",
      grant.id,
      "retainedCapabilities must be a subset of capabilities",
      retainedOutsideHeld,
    ));
  }

  for (const item of grant.extinguishments) {
    if (!grant.capabilities.includes(item.capability)) {
      failures.push(failure(
        "child_shape_invalid",
        grant.id,
        "extinguishment names a capability the grant never held",
        [item.capability],
      ));
    }
    if (instant(item.effectiveAt) === null || !nonEmpty(item.ref)) {
      failures.push(failure(
        "child_shape_invalid",
        grant.id,
        "extinguishment requires valid effectiveAt and ref",
        [item.capability],
      ));
    }
  }
}

function capabilityExtinguishedAt(
  grant: FatherhandGrantV01,
  capability: string,
  comparison: number,
): CapabilityExtinguishmentV01 | undefined {
  return grant.extinguishments.find((item) =>
    item.capability === capability &&
    instant(item.effectiveAt) !== null &&
    (instant(item.effectiveAt) as number) <= comparison
  );
}

export function validateFatherhandChain(input: {
  grants: FatherhandGrantV01[];
  terminalGrantId: string;
  required: FatherhandActRequirementV01;
  evaluatedAt: string;
}): AuthorityValidationReceiptV01 {
  const failures: FatherhandFailure[] = [];
  const uncertainties: string[] = [];
  const evaluated = instant(input.evaluatedAt);

  if (evaluated === null) {
    failures.push(failure("invalid_time", input.terminalGrantId, "evaluatedAt must be a valid instant", [input.evaluatedAt]));
  }

  const byId = new Map<string, FatherhandGrantV01>();
  for (const grant of input.grants) {
    if (byId.has(grant.id)) {
      failures.push(failure("duplicate_grant_id", grant.id, "grant id appears more than once", [grant.id]));
      continue;
    }
    byId.set(grant.id, grant);
    validateGrantLocalShape(grant, failures);
  }

  const terminal = byId.get(input.terminalGrantId);
  if (!terminal) {
    failures.push(failure(
      "missing_terminal_grant",
      input.terminalGrantId,
      "terminal grant was not supplied",
      [input.terminalGrantId],
    ));
  }

  const reversed: FatherhandGrantV01[] = [];
  if (terminal) {
    const seen = new Set<string>();
    let current: FatherhandGrantV01 | undefined = terminal;

    while (current) {
      if (seen.has(current.id)) {
        failures.push(failure("cycle", current.id, "grant chain contains a cycle", [current.id]));
        break;
      }
      seen.add(current.id);
      reversed.push(current);

      if (current.parentGrantId === null) break;
      const parent = byId.get(current.parentGrantId);
      if (!parent) {
        failures.push(failure(
          "missing_parent_grant",
          current.id,
          "parent grant is not present in supplied chain material",
          [current.parentGrantId],
        ));
        break;
      }
      current = parent;
    }
  }

  const chain = [...reversed].reverse();
  const root = chain[0];

  if (root) {
    if (
      root.parentGrantId !== null ||
      root.purpose.parentPurposeId !== null ||
      root.purpose.relation !== "origin" ||
      root.parentSeal !== undefined
    ) {
      failures.push(failure("root_shape_invalid", root.id, "root grant must begin both grant and purpose ancestry"));
    }
    if (!root.rootCapacityBasis || !nonEmpty(root.rootCapacityBasisRef)) {
      failures.push(failure("root_shape_invalid", root.id, "root grant requires explicit capacity basis and basis ref"));
    } else if (root.rootCapacityBasis === "indeterminate") {
      uncertainties.push(`root capacity basis remains indeterminate at ${root.rootCapacityBasisRef}`);
    }
  }

  for (let index = 1; index < chain.length; index += 1) {
    const parent = chain[index - 1]!;
    const child = chain[index]!;
    const childIssued = instant(child.issuedAt);

    if (child.fatherhandId !== parent.fatherhandId) {
      failures.push(failure("fatherhand_mismatch", child.id, "child changes fatherhandId", [parent.fatherhandId, child.fatherhandId]));
    }
    if (child.grantorId !== parent.granteeId) {
      failures.push(failure("grantor_discontinuity", child.id, "child grantor is not the parent grantee", [parent.granteeId, child.grantorId]));
    }
    if (!child.parentSeal || child.parentSeal !== parent.seal) {
      failures.push(failure("parent_seal_mismatch", child.id, "child does not expose the exact parent seal", [parent.seal, child.parentSeal || "<missing>"]));
    }
    if (!parent.transferable) {
      failures.push(failure("nontransferable_parent", child.id, "parent grant forbids downstream transfer", [parent.id]));
    }

    const extraCaps = subset(child.capabilities, parent.delegableCapabilities);
    if (extraCaps.length > 0) {
      failures.push(failure("capability_enlargement", child.id, "child received capabilities outside parent delegable set", extraCaps));
    }

    const extraScope = subset(child.scopeRefs, parent.delegableScopeRefs);
    if (extraScope.length > 0) {
      failures.push(failure("scope_enlargement", child.id, "child scope exceeds parent delegable scope", extraScope));
    }

    if (childIssued !== null) {
      if (effectiveAtOrBefore(parent.revokedAt, childIssued)) {
        failures.push(failure("revoked_chain", child.id, "child was issued after parent revocation became effective", [parent.revocationRef || parent.id]));
      }
      if (effectiveAtOrBefore(parent.expiresAt, childIssued)) {
        failures.push(failure("expired_chain", child.id, "child was issued after parent expiration", [parent.id]));
      }
      for (const capability of child.capabilities) {
        const extinguished = capabilityExtinguishedAt(parent, capability, childIssued);
        if (extinguished) {
          failures.push(failure(
            "extinguished_parent_capability",
            child.id,
            "child attempts to revive a capability extinguished in the parent",
            [capability, extinguished.ref],
          ));
        }
      }
    }

    if (parent.expiresAt && child.expiresAt) {
      const parentExpiry = instant(parent.expiresAt);
      const childExpiry = instant(child.expiresAt);
      if (parentExpiry !== null && childExpiry !== null && childExpiry > parentExpiry) {
        failures.push(failure("expiry_enlargement", child.id, "child expiration exceeds parent expiration", [parent.expiresAt, child.expiresAt]));
      }
    } else if (parent.expiresAt && !child.expiresAt) {
      failures.push(failure("expiry_enlargement", child.id, "time-bounded parent cannot create an unbounded child", [parent.expiresAt]));
    }

    if (child.purpose.parentPurposeId !== parent.purpose.purposeId) {
      failures.push(failure(
        "purpose_discontinuity",
        child.id,
        "child purpose does not expose the exact parent purpose",
        [parent.purpose.purposeId, child.purpose.parentPurposeId || "<missing>"],
      ));
    }
    if (!ALLOWED_CHILD_PURPOSE_RELATIONS.has(child.purpose.relation)) {
      failures.push(failure(
        "purpose_transformation",
        child.id,
        "child purpose relation requires fresh originating authorization rather than ordinary delegation",
        [child.purpose.relation],
      ));
    }
  }

  if (evaluated !== null) {
    for (const grant of chain) {
      if (effectiveAtOrBefore(grant.revokedAt, evaluated)) {
        failures.push(failure("revoked_chain", grant.id, "grant is revoked at evaluation time", [grant.revocationRef || grant.id]));
      }
      if (effectiveAtOrBefore(grant.expiresAt, evaluated)) {
        failures.push(failure("expired_chain", grant.id, "grant is expired at evaluation time", [grant.expiresAt!]));
      }
    }
  }

  if (terminal && evaluated !== null) {
    if (!terminal.capabilities.includes(input.required.capability)) {
      failures.push(failure(
        "required_capability_missing",
        terminal.id,
        "terminal grant does not hold required capability",
        [input.required.capability],
      ));
    }

    const missingScope = subset(input.required.scopeRefs, terminal.scopeRefs);
    if (missingScope.length > 0) {
      failures.push(failure(
        "required_scope_missing",
        terminal.id,
        "required act scope exceeds terminal grant scope",
        missingScope,
      ));
    }

    if (terminal.purpose.purposeId !== input.required.purposeId) {
      failures.push(failure(
        "required_purpose_mismatch",
        terminal.id,
        "required act purpose does not match terminal governing purpose",
        [terminal.purpose.purposeId, input.required.purposeId],
      ));
    }

    const extinguished = capabilityExtinguishedAt(terminal, input.required.capability, evaluated);
    if (extinguished) {
      failures.push(failure(
        "terminal_capability_extinguished",
        terminal.id,
        "required capability was extinguished before evaluation",
        [input.required.capability, extinguished.ref],
      ));
    }
  }

  const sortedFailures = sortFailures(failures);
  const result: AuthorityValidationReceiptV01["result"] =
    sortedFailures.length > 0 ? "invalid" : uncertainties.length > 0 ? "indeterminate" : "valid";

  return {
    schema: "tranchnode/fatherhand-authority-validation-receipt/v0.1",
    terminalGrantId: input.terminalGrantId,
    fatherhandId: terminal?.fatherhandId ?? null,
    chain: chain.map((grant) => grant.id),
    required: {
      capability: input.required.capability,
      scopeRefs: uniqueSorted(input.required.scopeRefs),
      purposeId: input.required.purposeId,
    },
    result,
    failures: sortedFailures,
    uncertainties: uniqueSorted(uncertainties),
    evaluatedAt: input.evaluatedAt,
    evaluatorVersion: "fatherhand-grant-validator/v0.1",
    nonClaims: [
      "receipt does not grant, renew, revoke, or delegate capability",
      "parentSeal linkage is checked as supplied data; cryptographic seal construction and signature validity are not evaluated",
      "root capacity basis is recorded but this validator does not prove universal jurisdiction or rightful ownership",
      "scopeRefs are a bounded exact-set profile, not a universal scope algebra",
      "purpose relation validation does not replace a separate purpose compatibility evaluation",
    ],
  };
}
