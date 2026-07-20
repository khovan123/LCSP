export type DeveloperTaskContext = {
  organization: { id: string; name: string };
  scope:
    | {
        type: "assessment";
        assessment: { id: string; name: string };
      }
    | { type: "organization"; assessment: null };
  granted_actions: string[];
};

export type DeveloperFinding = {
  finding_id: string;
  tool: string;
  finding_type: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  description: string;
};

export type DeveloperTaskContextOutcome =
  | { kind: "loaded"; context: DeveloperTaskContext }
  | { kind: "redirect"; location: "/sign-in" | "/mfa/verify" }
  | { kind: "access_revoked" }
  | { kind: "error" };

export type EvidenceOutcome =
  | { kind: "loaded"; findings: DeveloperFinding[] }
  | { kind: "empty" }
  | { kind: "redirect"; location: "/sign-in" | "/mfa/verify" }
  | { kind: "access_revoked" }
  | { kind: "error" };
