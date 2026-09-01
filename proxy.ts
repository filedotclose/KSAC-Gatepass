import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const rawSecret = process.env.JWT_SECRET;
const ACCESS_SECRET = rawSecret ? new TextEncoder().encode(rawSecret) : null;

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /dashboard
  if (pathname.startsWith("/dashboard")) {
    const token = request.cookies.get("accessToken")?.value;

    if (!token) {
      return applySecurityHeaders(NextResponse.redirect(new URL("/login", request.url)));
    }

    if (!ACCESS_SECRET) {
      console.error("Critical Security Alert: JWT_SECRET is not configured in environment.");
      return applySecurityHeaders(NextResponse.redirect(new URL("/login", request.url)));
    }

    try {
      // Verify token
      const { payload } = await jwtVerify(token, ACCESS_SECRET);

      const response = NextResponse.next();
      response.headers.set("x-user-role", payload.role as string);
      return applySecurityHeaders(response);
    } catch {
      // Token invalid or expired
      return applySecurityHeaders(NextResponse.redirect(new URL("/login", request.url)));
    }
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
