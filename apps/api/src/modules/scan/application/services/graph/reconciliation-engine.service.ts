import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { GraphSource, Prisma } from "@prisma/client";
import { RECONCILIATION_STATUSES } from "@lcsp/contracts/evidence";
import { toPrismaReconciliationStatus } from "../../../../../infrastructure/prisma/prisma-enum-mappers.js";

@Injectable()
export class ReconciliationEngineService {
  private readonly logger = new Logger(ReconciliationEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reconciles the observed graph vs declared graph for an assessment.
   * Currently implements Tier 1 (Deterministic) matching and orphan/missing categorization.
   *
   * TODO (Phase Advanced): Implement Tier 2 (Structural Matching via Jaccard/Context)
   * and Tier 3 (LLM-assisted mapping).
   */
  async reconcile(assessmentId: string): Promise<void> {
    this.logger.log(
      `Starting Phase 6 Reconciliation for assessment ${assessmentId}`,
    );

    // Fetch all nodes
    const observedNodes = await this.prisma.evidenceGraphNode.findMany({
      where: { assessmentId, source: GraphSource.OBSERVED },
    });

    const declaredNodes = await this.prisma.evidenceGraphNode.findMany({
      where: { assessmentId, source: GraphSource.DECLARED },
    });

    // We will build a map of canonicalName -> ID for fast Tier 1 matching
    const declaredNodeMap = new Map<string, (typeof declaredNodes)[0]>();
    for (const d of declaredNodes) {
      declaredNodeMap.set(d.canonicalName, d);
    }

    const observedNodeMap = new Map<string, (typeof observedNodes)[0]>();
    for (const o of observedNodes) {
      observedNodeMap.set(o.canonicalName, o);
    }

    const resultsToInsert: Prisma.GraphReconciliationResultCreateManyInput[] =
      [];

    // 1. Tier 1 Matching & ORPHANED check
    for (const observed of observedNodes) {
      const matchedDeclared = declaredNodeMap.get(observed.canonicalName);
      if (matchedDeclared && matchedDeclared.type === observed.type) {
        // CONFIRMED
        resultsToInsert.push({
          assessmentId,
          status: toPrismaReconciliationStatus(
            RECONCILIATION_STATUSES.confirmed,
          ),
          declaredNodeId: matchedDeclared.id,
          observedNodeId: observed.id,
        });
      } else {
        // ORPHANED_IN_OBSERVED (Code has it, but it's not declared)
        resultsToInsert.push({
          assessmentId,
          status: toPrismaReconciliationStatus(
            RECONCILIATION_STATUSES.orphanedInObserved,
          ),
          observedNodeId: observed.id,
        });
      }
    }

    // 2. MISSING check
    for (const declared of declaredNodes) {
      const matchedObserved = observedNodeMap.get(declared.canonicalName);
      if (!matchedObserved || matchedObserved.type !== declared.type) {
        // MISSING_IN_OBSERVED (Declared but not found in code)
        // TODO: Tier 2 and Tier 3 matching could be inserted here to see if this "Missing"
        // node is actually matching an "Orphaned" node under a different alias.
        resultsToInsert.push({
          assessmentId,
          status: toPrismaReconciliationStatus(
            RECONCILIATION_STATUSES.missingInObserved,
          ),
          declaredNodeId: declared.id,
        });
      }
    }

    // Run transaction: Delete old reconciliation results, insert new ones
    await this.prisma.$transaction(async (tx) => {
      await tx.graphReconciliationResult.deleteMany({
        where: { assessmentId },
      });

      if (resultsToInsert.length > 0) {
        await tx.graphReconciliationResult.createMany({
          data: resultsToInsert,
        });
      }
    });

    this.logger.log(
      `Completed Reconciliation for assessment ${assessmentId}. Inserted ${resultsToInsert.length} results.`,
    );
  }
}
