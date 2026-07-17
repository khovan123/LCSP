import { PBAC_ACTIONS } from "@lcsp/contracts/pbac";

export const PBAC_METADATA_KEY = PBAC_ACTIONS.metadataCheck;

export type PbacMetadata =
  { type: "session" } | { type: "action"; action: string };
