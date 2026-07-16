import "server-only";
import { hash, verify } from "@node-rs/argon2";

export function hashPassword(password: string) {
  // @node-rs/argon2 defaults to Argon2id, the library's recommended algorithm.
  return hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
}
export function verifyPassword(hashValue: string, password: string) { return verify(hashValue, password); }
