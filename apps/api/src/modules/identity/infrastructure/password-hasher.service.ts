import { Injectable } from "@nestjs/common";
import { argon2id, hash, verify } from "argon2";

@Injectable()
export class PasswordHasherService {
  hash(password: string): Promise<string> {
    return hash(password, {
      type: argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  verify(hashValue: string, password: string): Promise<boolean> {
    return verify(hashValue, password);
  }
}
