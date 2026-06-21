import { randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { argon2id, hash } from "argon2";

@Injectable()
export class RecoveryCodeService {
  generate(count = 10): string[] {
    return Array.from({ length: count }, () => {
      const value = randomBytes(8).toString("hex").toUpperCase();
      return `${value.slice(0, 8)}-${value.slice(8)}`;
    });
  }

  hash(code: string): Promise<string> {
    return hash(code, { type: argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 });
  }
}
