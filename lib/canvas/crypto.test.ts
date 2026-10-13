import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptToken, encryptToken, parseKey } from "./crypto";

const key = randomBytes(32);
const TOKEN = "1234~FakeTokenForTestsOnlyAbCdEfGhIjKlMnOpQrStUvWxYz0123456789";

describe("Canvas token encryption", () => {
  it("decrypts what it encrypted, and never stores the token as plain text", () => {
    const stored = encryptToken(TOKEN, key);
    expect(stored).not.toContain(TOKEN);
    expect(decryptToken(stored, key)).toBe(TOKEN);
  });

  it("uses a fresh random IV, so the same token encrypts differently each time", () => {
    expect(encryptToken(TOKEN, key)).not.toBe(encryptToken(TOKEN, key));
  });

  it("refuses a wrong key or a tampered value", () => {
    const stored = encryptToken(TOKEN, key);
    expect(decryptToken(stored, randomBytes(32))).toBeNull();
    const parts = stored.split(":");
    const flipped = Buffer.from(parts[3], "base64");
    flipped[0] ^= 1;
    expect(decryptToken([parts[0], parts[1], parts[2], flipped.toString("base64")].join(":"), key)).toBeNull();
    expect(decryptToken("not-a-token", key)).toBeNull();
  });

  it("only accepts a 64-hex-character key", () => {
    expect(parseKey("a".repeat(64))?.length).toBe(32);
    expect(parseKey("a".repeat(63))).toBeNull();
    expect(parseKey(undefined)).toBeNull();
    expect(parseKey("z".repeat(64))).toBeNull();
  });
});
