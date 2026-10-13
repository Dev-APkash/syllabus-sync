import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseConfig, hostOverride, publicSupabaseKey, siteUrl } from "../runtime-config";
import { AUTH_COOKIE_NAME, serverSupabaseUrl } from "./config";

// Pages anyone can open without logging in.
const PUBLIC_PATHS = ["/", "/privacy", "/goodbye", "/robots.txt"];
// "/auth/..." holds the login pages. "/api/..." routes check the user themselves
// and answer with JSON errors, so the proxy must not redirect them to a login page.
const PUBLIC_PREFIXES = ["/auth/", "/api/"];

function isPublic(pathname: string) {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

export async function updateSession(request: NextRequest) {
  // A proxy in front (e.g. Tailscale Serve) may have rewritten the Host header; Server Actions
  // would then refuse forms sent from our own address. Only ever applies to our own SITE_URL.
  const fixedHost = hostOverride(
    request.headers.get("origin"),
    request.headers.get("host"),
    request.headers.get("x-forwarded-host"),
    siteUrl(),
  );
  if (fixedHost) request.headers.set("x-forwarded-host", fixedHost);

  let supabaseResponse = NextResponse.next({
    request,
  });

  // Not configured (no Supabase address or key): skip the login check.
  if (!hasSupabaseConfig()) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    serverSupabaseUrl(),
    publicSupabaseKey()!,
    {
      cookieOptions: { name: AUTH_COOKIE_NAME },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const { pathname } = request.nextUrl;

  // Logged in and visiting the landing page: go straight to the dashboard.
  if (user && pathname === "/") {
    return redirectKeepingCookies(request, "/dashboard", supabaseResponse);
  }

  // Not logged in and visiting a private page: go to the login page.
  if (!user && !isPublic(pathname)) {
    return redirectKeepingCookies(request, "/auth/login", supabaseResponse);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object, copy over its cookies
  // (see redirectKeepingCookies below). If this is not done, you may be causing
  // the browser and server to go out of sync and terminate the user's session prematurely!
  return supabaseResponse;
}

// A redirect is a new response, so copy the refreshed login cookies onto it.
function redirectKeepingCookies(
  request: NextRequest,
  pathname: string,
  supabaseResponse: NextResponse,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  supabaseResponse.cookies
    .getAll()
    .forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
