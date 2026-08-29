import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function middleware(request) {
  const path = request.nextUrl.pathname;

  // Skip middleware for API routes and static files
  if (path.startsWith("/api") || path.startsWith("/_next")) {
    return NextResponse.next();
  }

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Public routes (no login required)
    const publicPaths = ["/", "/login", "/signup"];
    
    // Protected routes (login required)
    const protectedPaths = ["/dashboard", "/interview", "/report"];

    const isProtected = protectedPaths.some((p) => path.startsWith(p));
    const isPublic = publicPaths.includes(path);

    // If protected and not logged in → redirect to login
    if (isProtected && !user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // If logged in and on public page → redirect to dashboard
    if (isPublic && user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    // If middleware fails, allow the request to continue
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/", "/login", "/signup", "/dashboard/:path*", "/interview/:path*", "/report/:path*"],
};
