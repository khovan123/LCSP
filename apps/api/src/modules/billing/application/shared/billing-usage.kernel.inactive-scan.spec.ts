import { describe, expect, it, jest } from "@jest/globals";
import {
  BillingReservationStatus,
  RepositoryScanJobStatus,
} from "@prisma/client";

import { InvalidReservationTransitionError } from "../../domain/billing.errors.js";
import type { BillingTransactionPort } from "../../domain/repositories/billing-transaction.port.js";
import type { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import type { BillingAccountingKernel } from "./billing-accounting.kernel.js";
import { BillingUsageKernel } from "./billing-usage.kernel.js";

function kernelWith(input: {
  held: Array<{ id: string; userId: string; scanJobId: string | null }>;
  activeScanIds: string[];
  releaseReservation: jest.Mock<(args: unknown) => Promise<unknown>>;
}) {
  const reservationFindMany = jest
    .fn<(args: unknown) => Promise<unknown>>()
    .mockResolvedValue(input.held);
  const scanFindMany = jest
    .fn<(args: unknown) => Promise<unknown>>()
    .mockResolvedValue(input.activeScanIds.map((id) => ({ id })));
  const prisma = {
    billingReservation: { findMany: reservationFindMany },
    repositoryScanJob: { findMany: scanFindMany },
  } as unknown as PrismaService;
  const accounting = {
    releaseReservation: input.releaseReservation,
  } as unknown as BillingAccountingKernel;
  const kernel = new BillingUsageKernel(
    {} as BillingTransactionPort,
    accounting,
    prisma,
  );
  return { kernel, reservationFindMany, scanFindMany };
}

describe("BillingUsageKernel.releaseInactiveScanReservations", () => {
  it("releases holds of terminal or deleted scans and keeps an active scan's hold", async () => {
    const releaseReservation = jest
      .fn<(args: unknown) => Promise<unknown>>()
      .mockResolvedValue({});
    const { kernel, reservationFindMany, scanFindMany } = kernelWith({
      held: [
        { id: "hold-terminal", userId: "user-1", scanJobId: "scan-failed" },
        { id: "hold-deleted", userId: "user-1", scanJobId: "scan-deleted" },
        { id: "hold-active", userId: "user-1", scanJobId: "scan-running" },
      ],
      activeScanIds: ["scan-running"],
      releaseReservation,
    });

    const result = await kernel.releaseInactiveScanReservations("assessment-1");

    expect(reservationFindMany).toHaveBeenCalledWith({
      where: {
        assessmentId: "assessment-1",
        status: BillingReservationStatus.RESERVED,
        scanJobId: { not: null },
      },
      select: { id: true, userId: true, scanJobId: true },
    });
    expect(scanFindMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["scan-failed", "scan-deleted", "scan-running"] },
        status: {
          in: [RepositoryScanJobStatus.QUEUED, RepositoryScanJobStatus.RUNNING],
        },
      },
      select: { id: true },
    });
    expect(releaseReservation.mock.calls.map(([args]) => args)).toEqual([
      {
        userId: "user-1",
        reservationId: "hold-terminal",
        assessmentId: "assessment-1",
      },
      {
        userId: "user-1",
        reservationId: "hold-deleted",
        assessmentId: "assessment-1",
      },
    ]);
    expect(result).toEqual({
      releasedReservationIds: ["hold-terminal", "hold-deleted"],
    });
  });

  it("skips a hold settled concurrently and still releases the rest", async () => {
    const releaseReservation = jest
      .fn<(args: unknown) => Promise<unknown>>()
      .mockRejectedValueOnce(
        new InvalidReservationTransitionError(
          "Reservation is already terminal",
        ),
      )
      .mockResolvedValueOnce({});
    const { kernel } = kernelWith({
      held: [
        { id: "hold-settled", userId: "user-1", scanJobId: "scan-a" },
        { id: "hold-open", userId: "user-1", scanJobId: "scan-b" },
      ],
      activeScanIds: [],
      releaseReservation,
    });

    await expect(
      kernel.releaseInactiveScanReservations("assessment-1"),
    ).resolves.toEqual({ releasedReservationIds: ["hold-open"] });
  });

  it("propagates unexpected release failures", async () => {
    const releaseReservation = jest
      .fn<(args: unknown) => Promise<unknown>>()
      .mockRejectedValue(new Error("database unavailable"));
    const { kernel } = kernelWith({
      held: [{ id: "hold-open", userId: "user-1", scanJobId: "scan-a" }],
      activeScanIds: [],
      releaseReservation,
    });

    await expect(
      kernel.releaseInactiveScanReservations("assessment-1"),
    ).rejects.toThrow("database unavailable");
  });
});
