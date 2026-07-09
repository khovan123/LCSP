import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import type { UserRepository } from "../../application/ports/persistence/user.repository.js";
import { User } from "../../domain/entities/user.entity.js";
import { UserEmail } from "../../domain/value-objects/user-email.value-object.js";
import { UserId } from "../../domain/value-objects/user-id.value-object.js";

interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
}

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(user: User): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: user.id.toString() },
      create: {
        id: user.id.toString(),
        email: user.email.toString(),
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
      update: {
        email: user.email.toString(),
        displayName: user.displayName,
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });

    return record ? this.rehydrate(record) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase();
    const record = await this.prisma.user.findUnique({
      where: { email: normalized },
    });

    return record ? this.rehydrate(record) : null;
  }

  private rehydrate(record: UserRecord): User {
    return User.rehydrate({
      id: UserId.create(record.id),
      email: UserEmail.create(record.email),
      displayName: record.displayName,
      createdAt: record.createdAt,
    });
  }
}
