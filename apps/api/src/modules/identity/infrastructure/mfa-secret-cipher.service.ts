import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { EncryptedSecret } from "../domain/mfa.types.js";

@Injectable()
export class MfaSecretCipherService {
  encrypt(secret: string, context: string): EncryptedSecret {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key(), iv);
    cipher.setAAD(Buffer.from(context, "utf8"));
    const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
    return {
      ciphertext: Uint8Array.from(ciphertext),
      iv: Uint8Array.from(iv),
      authTag: Uint8Array.from(cipher.getAuthTag()),
      keyVersion: 1,
    };
  }

  decrypt(encrypted: EncryptedSecret, context: string): string {
    const decipher = createDecipheriv("aes-256-gcm", this.key(), encrypted.iv);
    decipher.setAAD(Buffer.from(context, "utf8"));
    decipher.setAuthTag(Buffer.from(encrypted.authTag));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted.ciphertext)),
      decipher.final(),
    ]).toString("utf8");
  }

  private key(): Buffer {
    const encoded = process.env.MFA_ENCRYPTION_KEY;
    if (!encoded) throw new Error("MFA_ENCRYPTION_KEY is required");
    const key = Buffer.from(encoded, "base64");
    if (key.byteLength !== 32) throw new Error("MFA_ENCRYPTION_KEY must decode to 32 bytes");
    if (process.env.NODE_ENV === "production" && key.every((byte) => byte === 0)) {
      throw new Error("The local MFA encryption key is forbidden in production");
    }
    return key;
  }
}
