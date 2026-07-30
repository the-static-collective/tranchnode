type NodeKind =
  | "source"
  | "observation"
  | "claim"
  | "inference"
  | "proposal"
  | "tension"
  | "witness"
  | "harvest";

  type EdgeKind =
  | "derived_from"
  | "supports"
  | "contradicts"
  | "qualifies"
  | "depends_on"
  | "supersedes"
  | "responds_to"
  | "witnesses"
  | "harvests";

  interface TranchNode {
  id: string;
  kind: NodeKind;
  content: unknown;
  scopeId: string;
  authorId: string;
  createdAt: string;
  sourceModel?: string;
  epistemicState: EpistemicState;
}

type EpistemicState =
  | "asserted"
  | "inferred"
  | "disputed"
  | "witnessed"
  | "superseded";
