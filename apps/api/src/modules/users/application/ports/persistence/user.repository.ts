import { User } from "../../../domain/entities/user.entity.js";

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");

export interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
}
