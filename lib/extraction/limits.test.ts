import { describe, expect, it } from "vitest";
import { describeBeginResult, extractionEnabled, maxExtractionsPerDay } from "./limits";

describe("describeBeginResult", () => {
  it("lets the extraction go ahead on ok", () => {
    expect(describeBeginResult("ok", 10)).toBeNull();
  });

  it("refuses the 4th reading of the same syllabus", () => {
    expect(describeBeginResult("syllabus_limit", 10)).toMatchObject({
      status: 429,
      message: expect.stringMatching(/already been read 3 times/),
    });
  });

  it("mentions the daily limit number", () => {
    expect(describeBeginResult("daily_limit", 10)?.message).toMatch(/limit of 10/);
  });

  it("treats a reading already in progress as a conflict, not a failure", () => {
    expect(describeBeginResult("busy", 10)?.status).toBe(409);
  });

  it("handles unexpected answers safely", () => {
    expect(describeBeginResult(null, 10)?.status).toBe(503);
    expect(describeBeginResult("something else", 10)?.status).toBe(503);
  });
});

describe("settings", () => {
  it("reads the daily limit with a safe default", () => {
    expect(maxExtractionsPerDay("5")).toBe(5);
    expect(maxExtractionsPerDay(undefined)).toBe(10);
    expect(maxExtractionsPerDay("lots")).toBe(10);
    expect(maxExtractionsPerDay("-3")).toBe(10);
  });

  it("only pauses extraction when explicitly set to false", () => {
    expect(extractionEnabled("false")).toBe(false);
    expect(extractionEnabled(" FALSE ")).toBe(false);
    expect(extractionEnabled("true")).toBe(true);
    expect(extractionEnabled(undefined)).toBe(true);
  });
});
