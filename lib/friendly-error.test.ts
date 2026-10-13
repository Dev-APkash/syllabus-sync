import { describe, expect, it } from "vitest";
import { friendlyMessage, isNetworkError, MAINTENANCE_MESSAGE } from "./friendly-error";

describe("friendly errors", () => {
  it("recognises network failures from browsers and Node", () => {
    expect(isNetworkError("TypeError: Failed to fetch")).toBe(true);
    expect(isNetworkError("TypeError: fetch failed")).toBe(true);
    expect(isNetworkError("connect ECONNREFUSED 192.0.2.5:443")).toBe(true);
  });

  it("leaves other errors alone", () => {
    expect(isNetworkError("Invalid login credentials")).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
  });

  it("uses the maintenance message only for network failures", () => {
    expect(friendlyMessage("Failed to fetch", "x")).toBe(MAINTENANCE_MESSAGE);
    expect(friendlyMessage("duplicate key", "Couldn't save.")).toBe("Couldn't save.");
  });
});
