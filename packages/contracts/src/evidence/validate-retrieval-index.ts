import type {
  AgenticToolCoverageState,
  AgenticToolName,
  AgenticToolStatus,
} from "./agentic-tool.ts";

export const LEGAL_RETRIEVAL_PROBE_SET_VERSIONS = {
  legalRetrievalProbesV1: "LEGAL_RETRIEVAL_PROBES_V1",
} as const;

export type LegalRetrievalProbeSetVersion =
  (typeof LEGAL_RETRIEVAL_PROBE_SET_VERSIONS)[keyof typeof LEGAL_RETRIEVAL_PROBE_SET_VERSIONS];

export const VALIDATE_RETRIEVAL_INDEX_TOOL = {
  name: "validate_retrieval_index",
  version: "1.0.0",
  configHash: "sha256:retrieval-validation-v1",
} as const;

export const VALIDATE_RETRIEVAL_INDEX_LIMITATION_CODES = {
  indexRefMissing: "INDEX_REF_MISSING",
  chunkSetMissing: "CHUNK_SET_MISSING",
  probeSetUnsupported: "PROBE_SET_UNSUPPORTED",
  indexChunkSetMismatch: "INDEX_CHUNK_SET_MISMATCH",
  indexArtifactMissing: "INDEX_ARTIFACT_MISSING",
  indexChecksumMismatch: "INDEX_CHECKSUM_MISMATCH",
  retrievalBackendFailed: "RETRIEVAL_BACKEND_FAILED",
  exactIdMissing: "EXACT_ID_MISSING",
  parentContextMissing: "PARENT_CONTEXT_MISSING",
  xrefContextMissing: "XREF_CONTEXT_MISSING",
  effectFilterFailed: "EFFECT_FILTER_FAILED",
} as const;

export type ValidateRetrievalIndexLimitationCode =
  (typeof VALIDATE_RETRIEVAL_INDEX_LIMITATION_CODES)[keyof typeof VALIDATE_RETRIEVAL_INDEX_LIMITATION_CODES];

const STABLE_INDEX_REF = "^legal-index:[A-Za-z0-9:_-]{8,220}$";
const STABLE_CHUNK_SET_REF = "^chunk-set:[A-Za-z0-9:_-]{8,220}$";
const STABLE_VALIDATION_REF = "^retrieval-validation:[A-Za-z0-9:_-]{8,220}$";

export const VALIDATE_RETRIEVAL_INDEX_INPUT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    indexRef: { type: "string", pattern: STABLE_INDEX_REF },
    chunkSetRef: { type: "string", pattern: STABLE_CHUNK_SET_REF },
    probeSetVersion: { const: LEGAL_RETRIEVAL_PROBE_SET_VERSIONS.legalRetrievalProbesV1 },
  },
  required: ["indexRef", "chunkSetRef", "probeSetVersion"],
} as const;

export const VALIDATE_RETRIEVAL_INDEX_RESULT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["validationManifestRef", "decision", "probeSummary", "findingRefs"],
  properties: {
    validationManifestRef: { type: "string", pattern: STABLE_VALIDATION_REF },
    decision: { enum: ["PASS", "FAIL"] },
    probeSummary: {
      type: "object",
      additionalProperties: false,
      required: ["exactId", "parentContext", "xrefContext", "effectFilter"],
      properties: {
        exactId: { type: "integer", minimum: 0 },
        parentContext: { type: "integer", minimum: 0 },
        xrefContext: { type: "integer", minimum: 0 },
        effectFilter: { type: "integer", minimum: 0 },
      },
    },
    findingRefs: {
      type: "array",
      items: { type: "string", minLength: 1 },
    },
  },
} as const;

export type ValidateRetrievalIndexRequest = {
  indexRef: string;
  chunkSetRef: string;
  probeSetVersion: LegalRetrievalProbeSetVersion;
};

export type ValidateRetrievalIndexLimitation = {
  code: ValidateRetrievalIndexLimitationCode | string;
  affectedScopeRef: string | null;
  reason: string;
  retryable: boolean;
};

export type ValidateRetrievalIndexResponse = {
  status: AgenticToolStatus;
  toolName: AgenticToolName;
  toolVersion: string;
  configHash: string;
  correlationId: string;
  artifactVersions: {
    indexId: string;
    retrievalValidationId: string;
  };
  provenanceRef: string;
  coverageState: AgenticToolCoverageState;
  evidenceRefs: string[];
  limitations: ValidateRetrievalIndexLimitation[];
  result: {
    validationManifestRef: string;
    decision: "PASS" | "FAIL";
    probeSummary: {
      exactId: number;
      parentContext: number;
      xrefContext: number;
      effectFilter: number;
    };
    findingRefs: string[];
  };
};
