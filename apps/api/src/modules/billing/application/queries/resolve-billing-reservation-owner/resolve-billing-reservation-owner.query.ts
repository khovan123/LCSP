import { Query } from "@nestjs/cqrs";

export class ResolveBillingReservationOwnerQuery extends Query<string> {
  constructor(public readonly reservationId: string) {
    super();
  }
}
