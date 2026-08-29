import { NextResponse } from "next/server";

// This is a simple middleware that doesn't import Supabase directly
// It checks cookies manually to determine if a user is logged in

export async function middleware(request) {
  const path = request.nextUrl.pathname;

  // Skip middleware for API routes, static files, and Next.js internal paths
  if (
    path.startsWith("/api") ||
    path.startsWith("/_next") ||
    path.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for Supabase session cookie (this is how Supabase stores auth in cookies)
  const supabaseSession = request.cookies.get("sb-access-token")?.value ||
                          request.cookies.get("sb-refresh-token")?.value;

  const isLoggedIn = !!supabaseSession;

  // Public routes (no login required)
  const publicPaths = ["/", "/login", "/signup"];
  const isPublic = publicPaths.includes(path);

  // Protected routes (login required)
  const isProtected = path.startsWith("/dashboard") ||
                      path.startsWith("/interview") ||
                      path.startsWith("/report");

  // If protected and not logged in → redirect to login
  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If logged in and on public page → redirect to dashboard
  if (isPublic && isLoggedIn && path !== "/") {
    // Don't redirect from root, let the page handle it
    if (path === "/") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If logged in and on root → redirect to dashboard
  if (isLoggedIn && path === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/signup",
    "/dashboard/:path*",
    "/interview/:path*",
    "/report/:path*",
  ],
};
