import { describe, expect, it } from "vitest";
import { hasSupabaseConfig, hostOverride, publicSupabaseKey, publicSupabaseUrl, siteUrl } from "./runtime-config";

describe("runtime settings", () => {
  it("reads the self-hosted names, with Supabase on the app's own address", () => {
    const env = { SITE_URL: "https://syllabus.example.ts.net/", SUPABASE_PUBLISHABLE_KEY: "anon-key" };
    expect(siteUrl(env)).toBe("https://syllabus.example.ts.net");
    expect(publicSupabaseUrl(env)).toBe("https://syllabus.example.ts.net");
    expect(publicSupabaseKey(env)).toBe("anon-key");
    expect(hasSupabaseConfig(env)).toBe(true);
  });

  it("falls back to the NEXT_PUBLIC names (the Vercel app)", () => {
    const env = {
      NEXT_PUBLIC_SITE_URL: "https://app.example.com",
      NEXT_PUBLIC_SUPABASE_URL: "https://api.example.com",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x",
    };
    expect(siteUrl(env)).toBe("https://app.example.com");
    expect(publicSupabaseUrl(env)).toBe("https://api.example.com");
    expect(publicSupabaseKey(env)).toBe("sb_publishable_x");
  });

  it("prefers an explicit Supabase address over the site address", () => {
    expect(publicSupabaseUrl({ SITE_URL: "https://a.example.com", SUPABASE_PUBLIC_URL: "https://b.example.com" })).toBe(
      "https://b.example.com",
    );
  });

  it("treats blank values as missing", () => {
    expect(hasSupabaseConfig({ SITE_URL: " ", SUPABASE_PUBLISHABLE_KEY: "" })).toBe(false);
    expect(siteUrl({})).toBe("http://localhost:3000");
  });
});

describe("hostOverride", () => {
  const site = "https://syllabus.example.ts.net";

  it("fixes the host only for requests from our own address", () => {
    expect(hostOverride(site, "127.0.0.1:8080", null, site)).toBe("syllabus.example.ts.net");
    expect(hostOverride("https://evil.example.com", "127.0.0.1:8080", null, site)).toBeNull();
  });

  it("leaves requests alone when the host already matches or there's no Origin", () => {
    expect(hostOverride(site, "syllabus.example.ts.net", null, site)).toBeNull();
    expect(hostOverride(site, "127.0.0.1:8080", "syllabus.example.ts.net", site)).toBeNull();
    expect(hostOverride(null, "127.0.0.1:8080", null, site)).toBeNull();
    expect(hostOverride("not a url", "x", null, site)).toBeNull();
  });
});
