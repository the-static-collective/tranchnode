// fulfillment.ts - tightened minimum ontology
// Canon:
// - A receipt records a real-world response, not proof of success
// - A witness preserves a claim, not moral worth
// - Fulfillment answers only a scoped Need
// - Canonical events and derived projections never exchange roles
// - Missing provenance may remain unknown, never silently invented
// - Child remains telos without becoming telemetry

export type EntityId = string;
export type ISO8601 = string;
export type ContentHash = `sha256:${string}`;

export type Quantity = { value: number; unit: string };
export type Visibility = "private" | "participants" | "circle" | "public";
export type FulfillmentKind = "meal" | "grocery" | "childcare" | "tutoring" | "repair" | "transport" | "oral_history" | "planting" | "other";
export type FulfillmentOutcome = "attempted" | "partial" | "scoped_complete" | "scope_uncertain";
export type FulfillmentOrigin = "joined_offer" | "direct_response" | "external" | "unknown";

export interface DisclosurePolicy {
  audience: Visibility;
  permittedFields: { summary: boolean; quantity: boolean; coarseTime: boolean; coarsePlace: boolean; exactPlace: boolean; participantIdentity: boolean; artifacts: boolean };
  basis: "participant_authorized" | "recorder_only" | "aggregate_only" | "public_event" | "withheld";
}
export interface ExternalProvenance { system?: string; sourceRef: string; sourceHash?: ContentHash }
export const CANONICALIZATION_VERSION = 1 as const;
export interface CanonicalEnvelope<T> { canonicalizationVersion: typeof CANONICALIZATION_VERSION; payload: T }

export interface NeedDeclared {
  id: EntityId; type: "NEED_DECLARED"; version: 1; createdAt: ISO8601; createdBy: EntityId; visibility: Visibility;
  summary: string; kind: FulfillmentKind; requestedQuantity?: Quantity; disclosurePolicy: DisclosurePolicy; canonicalHash: ContentHash;
}
export interface OfferDeclared {
  id: EntityId; type: "OFFER_DECLARED"; version: 1; createdAt: ISO8601; createdBy: EntityId; inspiredBy?: EntityId;
  summary: string; kind?: FulfillmentKind; offeredQuantity?: Quantity; visibility: Visibility; disclosurePolicy: DisclosurePolicy; canonicalHash: ContentHash;
}
export interface JoinDeclared {
  id: EntityId; type: "JOIN_DECLARED"; version: 1; needId: EntityId; offerId: EntityId; needSnapshotHash: ContentHash;
  offerSnapshotHash: ContentHash; joinedQuantity?: Quantity; occurredAt: ISO8601; recordedAt: ISO8601; recordedBy: EntityId; canonicalHash: ContentHash;
}
export interface FulfillmentRecorded {
  id: EntityId; type: "FULFILLMENT_RECORDED"; version: 1; needId: EntityId; needSnapshotHash: ContentHash;
  offerId?: EntityId; offerSnapshotHash?: ContentHash; offerIds?: EntityId[]; joinId?: EntityId; origin: FulfillmentOrigin;
  externalProvenance?: ExternalProvenance; outcome: FulfillmentOutcome; occurredAt: ISO8601; recordedAt: ISO8601; recordedBy: EntityId;
  fulfillment: { kind: FulfillmentKind; summary: string; quantity?: Quantity };
  visibility: Visibility; disclosurePolicy: DisclosurePolicy; canonicalHash: ContentHash;
}
export interface WitnessRecorded {
  id: EntityId; type: "WITNESS_RECORDED"; version: 1; subjectId: EntityId; mode: "self_attested" | "participant" | "third_party" | "artifact";
  statement?: string; artifactRefs?: string[]; witnessedAt?: ISO8601; recordedAt: ISO8601; recordedBy: EntityId; visibility: Visibility;
  disclosurePolicy?: DisclosurePolicy; canonicalHash: ContentHash;
}
export interface CounterWitnessRecorded { id: EntityId; type: "COUNTER_WITNESS_RECORDED"; version: 1; subjectWitnessId: EntityId; statement: string; recordedAt: ISO8601; recordedBy: EntityId; visibility: Visibility; canonicalHash: ContentHash }
export interface ProvenanceLinkRecorded { id: EntityId; type: "PROVENANCE_LINK_RECORDED"; version: 1; fromId: EntityId; toId: EntityId; relation: "CLARIFIES_ORIGIN" | "CONNECTS_EXTERNAL" | "SUPERSEDES"; note?: string; recordedAt: ISO8601; recordedBy: EntityId; canonicalHash: ContentHash }
export interface NeedPaused { id: EntityId; type: "NEED_PAUSED"; version: 1; needId: EntityId; needSnapshotHash: ContentHash; reason?: string; pausedAt: ISO8601; recordedAt: ISO8601; recordedBy: EntityId; canonicalHash: ContentHash }
export interface NeedWithdrawn { id: EntityId; type: "NEED_WITHDRAWN"; version: 1; needId: EntityId; needSnapshotHash: ContentHash; reason?: string; withdrawnAt: ISO8601; recordedAt: ISO8601; recordedBy: EntityId; canonicalHash: ContentHash }
export interface SoilRecorded { id: EntityId; type: "SOIL_RECORDED"; version: 1; subjectId: EntityId; reason: "fulfilled" | "composted" | "monumented" | "withdrawn"; note?: string; recordedAt: ISO8601; recordedBy: EntityId; canonicalHash: ContentHash }

export interface NeedProjection {
  needId: EntityId; requestedQuantity?: Quantity; fulfilledQuantity?: Quantity; remainingQuantity?: Quantity; fulfillmentCount: number;
  status: "open" | "paused" | "partially_answered" | "scope_answered" | "withdrawn" | "unknown";
  stillCalling: boolean; confidence: "known" | "partial" | "unknown"; lastFulfillmentId?: EntityId; derivedAt: ISO8601;
}
export interface StillCallingProjection { needId: EntityId; stillCalling: boolean; remainingQuantity?: Quantity; derivedAt: ISO8601 }
export interface PublicAggregateProjection { window: { from: ISO8601; to: ISO8601 }; mealsProvided: number; requestsAnswered: number; openScopes: number; outcomeUnknown: number; derivedAt: ISO8601 }
export interface MorningAuditProjection { date: string; householdRequestsAnswered: number; mealsMateriallyProvided: number; openMealScopes: number; outcomeUnknown: number; newOffers: number; witnessesRecorded: number; harvestsGenerated: number; continuityPreserved: boolean; derivedAt: ISO8601 }
