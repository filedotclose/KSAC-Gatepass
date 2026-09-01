import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose"; // Using jose for edge-compatible JWT verification

const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret");

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /dashboard
  if (pathname.startsWith("/dashboard")) {
    const token = request.cookies.get("accessToken")?.value;

    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
      // Verify token
      const { payload } = await jwtVerify(token, ACCESS_SECRET);
      
      // Add role to headers so server components can access it easily if needed
      const response = NextResponse.next();
      response.headers.set("x-user-role", payload.role as string);
      return response;
    } catch (error) {
      // Token invalid or expired
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
