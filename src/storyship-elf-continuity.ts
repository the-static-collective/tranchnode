/** FLIGHT-002: read-only adapter for STORYSHIP's narrow ELF Ark arrival evidence.
 * This does NOT verify the Ark bytes, run Storyship, admit a TranchNode event,
 * certify a cold boot, or claim the successor ELF exists.
 */
import { addressJson, type Addressed } from "./residual.js";

const SCHEMA = "storyship/elf-continuity-evidence/v0" as const;
const HEX = /^sha256:[0-9a-f]{64}$/;
const RAW_HEX = /^[0-9a-f]{64}$/;
const OCC = /^[0-9a-f]{32}$/;
const FIELDS = [
  "schema", "ark_id", "origin_occurrence_id", "origin_receipt_sha256",
  "declared_parent_receipt_sha256", "artifact_sha256", "arrival_id",
  "arrival_occurrence_id", "local_material", "cold_boot",
  "original_elf_execution", "successor_elf", "external_witness",
  "destination_status", "authority", "evidence_id",
] as const;

export interface StoryshipContinuityProposalV0 {
  schema: "tranchnode/storyship-elf-continuity-proposal/v0";
  sourceEvidenceId: string;
  sourceOwner: "the-static-collective/STORYSHIP";
  originOccurrenceId: string;
  originReceiptRef: string;
  arkRef: string;
  receivedArtifactRef: string;
  arrivalRef: string;
  declaredParentReceiptRef: string | null;
  localMaterial: "storyship-reported-verified";
  externalMaterialVerification: "not_performed";
  coldBoot: "not_observed";
  successorOccurrence: "not_observed";
  proposedNextStage: "independently_verify_new_elf";
  adoption: "not_attempted";
  authority: "none";
  unresolved: string[];
}

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("STORYSHIP_EVIDENCE_NOT_OBJECT");
  }
  const obj = value as Record<string, unknown>;
  if (Object.keys(obj).length !== FIELDS.length ||
      FIELDS.some((key) => !Object.prototype.hasOwnProperty.call(obj, key))) {
    throw new Error("STORYSHIP_EVIDENCE_FIELDS");
  }
  return obj;
}

export function proposeStoryshipElfContinuity(
  evidence: unknown,
): Addressed<StoryshipContinuityProposalV0> {
  const e = record(evidence);
  if (e.schema !== SCHEMA ||
      typeof e.ark_id !== "string" || !HEX.test(e.ark_id) ||
      typeof e.origin_occurrence_id !== "string" || !OCC.test(e.origin_occurrence_id) ||
      typeof e.origin_receipt_sha256 !== "string" || !HEX.test(e.origin_receipt_sha256) ||
      typeof e.artifact_sha256 !== "string" || !HEX.test(e.artifact_sha256) ||
      typeof e.arrival_id !== "string" || !HEX.test(e.arrival_id) ||
      typeof e.arrival_occurrence_id !== "string" ||
      !/^[0-9a-f-]{36}$/.test(e.arrival_occurrence_id) ||
      (e.declared_parent_receipt_sha256 !== null &&
        (typeof e.declared_parent_receipt_sha256 !== "string" ||
         !RAW_HEX.test(e.declared_parent_receipt_sha256))) ||
      e.local_material !== "verified" ||
      e.cold_boot !== "not_observed" ||
      e.original_elf_execution !== "not_verified" ||
      e.successor_elf !== "not_observed" ||
      e.external_witness !== "none" ||
      e.destination_status !== "materialized_unadmitted" ||
      e.authority !== "none" ||
      typeof e.evidence_id !== "string" || !HEX.test(e.evidence_id)) {
    throw new Error("STORYSHIP_EVIDENCE_ESCALATION_OR_INVALID");
  }
  // Storyship's v0 evidence contains ASCII string/null fields exclusively:
  // this restricted body has identical ordered JSON bytes under both current
  // canonicalizers. Hash equality is LOCAL consistency, never authentication.
  const { evidence_id, ...body } = e;
  if (addressJson(body).hash !== evidence_id) {
    throw new Error("STORYSHIP_EVIDENCE_DIGEST_MISMATCH");
  }
  const proposal: StoryshipContinuityProposalV0 = {
    schema: "tranchnode/storyship-elf-continuity-proposal/v0",
    sourceEvidenceId: evidence_id,
    sourceOwner: "the-static-collective/STORYSHIP",
    originOccurrenceId: e.origin_occurrence_id as string,
    originReceiptRef: e.origin_receipt_sha256 as string,
    arkRef: e.ark_id as string,
    receivedArtifactRef: e.artifact_sha256 as string,
    arrivalRef: e.arrival_id as string,
    declaredParentReceiptRef: e.declared_parent_receipt_sha256 as string | null,
    localMaterial: "storyship-reported-verified",
    externalMaterialVerification: "not_performed",
    coldBoot: "not_observed",
    successorOccurrence: "not_observed",
    proposedNextStage: "independently_verify_new_elf",
    adoption: "not_attempted",
    authority: "none",
    unresolved: [
      "Original ELF execution not independently verified by this adapter.",
      "A physical shutdown, transport and new boot have not been witnessed.",
      "No independently verified successor ELF occurrence exists in the supplied evidence.",
      "The source evidence digest is not an authenticated source-owner signature.",
    ],
  };
  return addressJson(proposal);
}
