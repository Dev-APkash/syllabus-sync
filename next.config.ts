import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
// These NEXT_PUBLIC_* values exist only in builds that bake them in (the Vercel app). The
// published self-hosted image is built without them and reads its address at runtime
// (lib/runtime-config.ts): there the values below are empty, and same-origin rules ('self') apply.
//
// HSTS is skipped for an explicitly plain-http build. Over plain http browsers ignore it anyway.
const plainHttp = (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("http://");
const httpsOnly = !isDev && !plainHttp;
const siteHost = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host : "";
// The browser talks to Supabase directly (sign-in, uploads) and shows PDFs from it in an iframe.
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "";

/*
 * Content Security Policy: which sources the browser may load things from.
 * Uses the "without nonces" setup from the Next.js docs so pages can stay
 * statically rendered. 'unsafe-eval' is only needed by React in development.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval' https://va.vercel-scripts.com" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  ["connect-src 'self'", supabaseOrigin, ...(isDev ? ["ws:", "https://va.vercel-scripts.com"] : [])]
    .filter(Boolean)
    .join(" "),
  // 'self': self-hosted copies serve the PDF preview from their own address (and the published
  // image doesn't know the Supabase address at build time).
  ["frame-src 'self'", supabaseOrigin].filter(Boolean).join(" "),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // No upgrade-insecure-requests: every resource is same-origin or https already, and it would
  // break self-hosted copies served over plain http on a home network.
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Don't let other sites put this app in a frame (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Don't let browsers guess file types (e.g. treat an upload as a script).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Never send full URLs (which can contain the calendar token) to other sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // This app never needs the camera, microphone or location.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  // Always use HTTPS for the next two years once a browser has visited.
  ...(httpsOnly ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  poweredByHeader: false,
  // The Docker image (Dockerfile) needs a self-contained "standalone" build.
  // Only switched on there, so Vercel builds are unchanged.
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  // Behind proxies (Tailscale → Caddy → app) the Host header can differ from the address in
  // the browser, which Next.js's form-protection check would reject. Allow exactly our own site.
  // Build-time only (Vercel); the published image fixes the same thing at runtime in
  // lib/supabase/proxy.ts (hostOverride).
  experimental: {
    serverActions: { allowedOrigins: siteHost ? [siteHost] : [] },
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // Calendar feeds are private links: keep them out of search engines.
      { source: "/api/calendar/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
