import { describe, expect, it } from "vitest";
import { isValidTimeZone } from "./timezone";

describe("isValidTimeZone", () => {
  it("accepts real IANA names", () => {
    expect(isValidTimeZone("America/Chicago")).toBe(true);
    expect(isValidTimeZone("Europe/London")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
  });

  it("rejects made-up or empty names", () => {
    expect(isValidTimeZone("Mars/Olympus_Mons")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
    expect(isValidTimeZone("x".repeat(100))).toBe(false);
  });
});
