// Encrypts Canvas access tokens before they're stored (AES-256-GCM, Node's built-in crypto).
// The key is 32 random bytes, written as 64 hex characters in CANVAS_TOKEN_KEY.
// GCM also detects tampering: a changed ciphertext fails to decrypt instead of giving garbage.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";

/** Turns the 64-hex-character key into bytes, or null if it's missing or malformed. */
export function parseKey(hex: string | undefined): Buffer | null {
  const trimmed = hex?.trim() ?? "";
  return /^[0-9a-fA-F]{64}$/.test(trimmed) ? Buffer.from(trimmed, "hex") : null;
}

/** "v1:<iv>:<auth tag>:<ciphertext>", all base64. A fresh random IV every time. */
export function encryptToken(token: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64"), cipher.getAuthTag().toString("base64"), ciphertext.toString("base64")].join(
    ":",
  );
}

/** The original token, or null if the value was tampered with or the key is wrong. */
export function decryptToken(stored: string, key: Buffer): string | null {
  const [version, iv, tag, ciphertext] = stored.split(":");
  if (version !== VERSION || !iv || !tag || !ciphertext) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
