import { Injectable } from "@nestjs/common";

@Injectable()
export class EvidenceNormalizerService {
  /**
   * Normalizes an endpoint canonical name.
   * E.g. "POST /api/users/:id" -> "HTTP:POST:/api/users/{param}"
   */
  normalizeEndpoint(canonicalName: string): string {
    if (!canonicalName) return "UNKNOWN";

    let normalized = canonicalName;
    const methods = ["GET ", "POST ", "PUT ", "DELETE ", "PATCH "];

    if (
      !normalized.startsWith("HTTP:") &&
      methods.some((m) => normalized.startsWith(m))
    ) {
      const parts = normalized.split(" ");
      if (parts.length >= 2) {
        let path = parts[1];
        // Replace dynamic segments :id or {id} with {param}
        path = path
          .replace(/:[^\/]+/g, "{param}")
          .replace(/\{[^\}]+\}/g, "{param}");
        normalized = `HTTP:${parts[0]}:${path}`;
      }
    }
    return normalized;
  }

  normalizeNode(node: any) {
    if (!node) return node;

    if (node.type === "CONTROLLER" || node.type === "ROUTE") {
      node.canonicalName = this.normalizeEndpoint(node.canonicalName);
    }
    return node;
  }
}
