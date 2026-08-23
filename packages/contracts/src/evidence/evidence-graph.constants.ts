export const GRAPH_NODE_TYPES = {
  service: "SERVICE",
  messageBroker: "MESSAGE_BROKER",
  database: "DATABASE",
  topic: "TOPIC",
  queue: "QUEUE",
  externalApi: "EXTERNAL_API",
  controller: "CONTROLLER",
} as const;

export type GraphNodeType = (typeof GRAPH_NODE_TYPES)[keyof typeof GRAPH_NODE_TYPES];

export const GRAPH_EDGE_TYPES = {
  calls: "CALLS",
  publishes: "PUBLISHES",
  consumes: "CONSUMES",
  reads: "READS",
  writes: "WRITES",
  sharesDataWith: "SHARES_DATA_WITH",
} as const;

export type GraphEdgeType = (typeof GRAPH_EDGE_TYPES)[keyof typeof GRAPH_EDGE_TYPES];

export const GRAPH_SOURCES = {
  observed: "OBSERVED",
  declared: "DECLARED",
} as const;

export type GraphSource = (typeof GRAPH_SOURCES)[keyof typeof GRAPH_SOURCES];

export const EVIDENCE_TYPES = {
  static: "STATIC",
  contract: "CONTRACT",
  config: "CONFIG",
  documentation: "DOCUMENTATION",
  runtime: "RUNTIME",
} as const;

export type EvidenceType = (typeof EVIDENCE_TYPES)[keyof typeof EVIDENCE_TYPES];

export const RECONCILIATION_STATUSES = {
  confirmed: "CONFIRMED",
  missingInObserved: "MISSING_IN_OBSERVED",
  orphanedInObserved: "ORPHANED_IN_OBSERVED",
  conflict: "CONFLICT",
} as const;

export type ReconciliationStatus = (typeof RECONCILIATION_STATUSES)[keyof typeof RECONCILIATION_STATUSES];
