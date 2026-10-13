import { describe, expect, it } from "vitest";
import { estimateCostUsd } from "./pricing";

describe("estimateCostUsd", () => {
  it("prices Sonnet 5 at $2 in / $10 out per million tokens", () => {
    // 20,000 input tokens = $0.04; 3,000 output tokens = $0.03
    expect(estimateCostUsd("claude-sonnet-5", 20_000, 3_000)).toBe(0.07);
  });

  it("prices Haiku 4.5 at half that, with or without a date suffix", () => {
    expect(estimateCostUsd("claude-haiku-4-5", 20_000, 3_000)).toBe(0.035);
    expect(estimateCostUsd("claude-haiku-4-5-20251001", 20_000, 3_000)).toBe(0.035);
  });

  it("returns null for models it doesn't know", () => {
    expect(estimateCostUsd("some-other-model", 1, 1)).toBeNull();
  });
});
