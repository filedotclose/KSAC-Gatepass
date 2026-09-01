import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { generateAccessToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { getClientIp, checkGeneralRateLimit, setRateLimitHeaders } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    const clientIp = getClientIp(req);
    const rateLimitResult = checkGeneralRateLimit(clientIp);
    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        { message: `Too many requests. Please try again in ${rateLimitResult.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    const refreshSecret = process.env.REFRESH_SECRET;
    if (!refreshSecret) {
      return NextResponse.json({ message: "Server configuration error" }, { status: 500 });
    }

    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refreshToken")?.value;

    if (!refreshToken) {
      return NextResponse.json({ message: "No refresh token provided" }, { status: 401 });
    }

    await connectDB();

    // Verify token
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, refreshSecret);
    } catch {
      return NextResponse.json({ message: "Invalid or expired refresh token" }, { status: 403 });
    }

    // Check if user exists and has this token
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return NextResponse.json({ message: "Unauthorized refresh token" }, { status: 403 });
    }

    // Generate new access token
    const accessToken = generateAccessToken(user);

    const response = NextResponse.json({ message: "Token refreshed successfully" });
    setRateLimitHeaders(response.headers, rateLimitResult);

    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });

    return response;
  } catch (error) {
    return NextResponse.json({ message: "Server error during token refresh" }, { status: 500 });
  }
}
