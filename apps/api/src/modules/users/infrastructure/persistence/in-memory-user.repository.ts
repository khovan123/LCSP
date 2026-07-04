import { Injectable } from "@nestjs/common";

import type { UserRepository } from "../../application/ports/persistence/user.repository.js";
import { User } from "../../domain/entities/user.entity.js";
import { UserEmail } from "../../domain/value-objects/user-email.value-object.js";
import { UserId } from "../../domain/value-objects/user-id.value-object.js";

type StoredUser = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
};

@Injectable()
export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, StoredUser>();

  async save(user: User): Promise<void> {
    this.users.set(user.id.toString(), {
      id: user.id.toString(),
      email: user.email.toString(),
      displayName: user.displayName,
      createdAt: user.createdAt.toISOString(),
    });
  }

  async findById(id: string): Promise<User | null> {
    const stored = this.users.get(id);

    return stored ? this.rehydrate(stored) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase();
    const stored = [...this.users.values()].find(
      (candidate) => candidate.email === normalized,
    );

    return stored ? this.rehydrate(stored) : null;
  }

  private rehydrate(stored: StoredUser): User {
    return User.rehydrate({
      id: UserId.create(stored.id),
      email: UserEmail.create(stored.email),
      displayName: stored.displayName,
      createdAt: new Date(stored.createdAt),
    });
  }
}
