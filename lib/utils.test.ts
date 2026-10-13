import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins class names and lets later Tailwind classes win", () => {
    expect(cn("p-2", "font-bold", "p-4")).toBe("font-bold p-4");
  });
});
