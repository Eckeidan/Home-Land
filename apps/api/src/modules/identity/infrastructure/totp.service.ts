import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Injectable } from "@nestjs/common";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

@Injectable()
export class TotpService {
  generateSecret(): string {
    return this.encodeBase32(randomBytes(20));
  }

  provisioningUri(secret: string, accountName: string): string {
    const issuer = "The Home Land";
    const label = encodeURIComponent(`${issuer}:${accountName}`);
    return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
  }

  verify(secret: string, code: string, now = Date.now()): boolean {
    if (!/^\d{6}$/.test(code)) return false;
    const step = Math.floor(now / 30_000);
    for (const offset of [-1, 0, 1]) {
      const expected = this.code(secret, step + offset);
      if (timingSafeEqual(Buffer.from(expected), Buffer.from(code))) return true;
    }
    return false;
  }

  code(secret: string, step = Math.floor(Date.now() / 30_000)): string {
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(step));
    const digest = createHmac("sha1", this.decodeBase32(secret)).update(counter).digest();
    const offset = (digest.at(-1) ?? 0) & 0x0f;
    const binary = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
    return binary.toString().padStart(6, "0");
  }

  private encodeBase32(bytes: Uint8Array): string {
    let bits = 0;
    let value = 0;
    let output = "";
    for (const byte of bytes) {
      value = (value << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        output += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
    return output;
  }

  private decodeBase32(value: string): Buffer {
    let bits = 0;
    let buffer = 0;
    const output: number[] = [];
    for (const character of value.replace(/=+$/g, "").toUpperCase()) {
      const index = alphabet.indexOf(character);
      if (index < 0) throw new Error("Invalid base32 secret");
      buffer = (buffer << 5) | index;
      bits += 5;
      if (bits >= 8) {
        output.push((buffer >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    return Buffer.from(output);
  }
}
