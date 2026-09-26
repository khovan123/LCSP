import { Command } from "@nestjs/cqrs";

export class ReleaseInactiveScanReservationsCommand extends Command<{
  releasedReservationIds: string[];
}> {
  constructor(public readonly assessmentId: string) {
    super();
  }
}
