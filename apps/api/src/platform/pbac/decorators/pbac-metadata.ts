export const PBAC_METADATA_KEY = "pbac:metadata";

export type PbacMetadata =
  { type: "session" } | { type: "action"; action: string };
