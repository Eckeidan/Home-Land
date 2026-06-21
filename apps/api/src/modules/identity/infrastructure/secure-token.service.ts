import { createHash, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";

@Injectable()
export class SecureTokenService {
  generate(): string {
    return randomBytes(32).toString("base64url");
  }

  hash(token: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(createHash("sha256").update(token, "utf8").digest());
  }
}
