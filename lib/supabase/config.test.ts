import { describe, expect, it } from "vitest";
import { toPublicUrl } from "./config";

describe("toPublicUrl", () => {
  const signed = "http://api-gw:8000/storage/v1/object/sign/syllabi/u1/s1.pdf?token=abc";

  it("swaps the internal Docker address for the public one", () => {
    expect(toPublicUrl(signed, "http://api-gw:8000", "https://syllabus.example.ts.net")).toBe(
      "https://syllabus.example.ts.net/storage/v1/object/sign/syllabi/u1/s1.pdf?token=abc",
    );
  });

  it("ignores trailing slashes on either address", () => {
    expect(toPublicUrl(signed, "http://api-gw:8000/", "https://syllabus.example.ts.net/")).toBe(
      "https://syllabus.example.ts.net/storage/v1/object/sign/syllabi/u1/s1.pdf?token=abc",
    );
  });

  it("leaves links alone when there's no internal address (e.g. on Vercel)", () => {
    expect(toPublicUrl(signed, undefined, "https://api.example.com")).toBe(signed);
    const external = "https://api.example.com/storage/v1/object/sign/x";
    expect(toPublicUrl(external, "http://api-gw:8000", "https://api.example.com")).toBe(external);
  });
});
