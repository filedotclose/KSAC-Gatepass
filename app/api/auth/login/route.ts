import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { generateAccessToken, generateRefreshToken } from "@/lib/jwt";
import { getClientIp, checkAuthRateLimit, setRateLimitHeaders } from "@/lib/rateLimit";
import { parseAndValidateBody, sanitizeEmail, sanitizeString } from "@/lib/sanitize";

export async function POST(req: Request) {
  try {
    const clientIp = getClientIp(req);

    // 1. Safe Body Parsing & Payload Size Limit (< 50KB)
    const bodyResult = await parseAndValidateBody<{ email?: unknown; password?: unknown }>(req);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const { email, password } = bodyResult.data;

    // 2. Input Sanitization
    const emailCheck = sanitizeEmail(email);
    if (!emailCheck.valid) {
      return NextResponse.json({ message: emailCheck.error }, { status: 400 });
    }
    const cleanEmail = emailCheck.email;

    const passwordCheck = sanitizeString(password, 128, "Password");
    if (!passwordCheck.valid || !passwordCheck.value) {
      return NextResponse.json({ message: "Password is required." }, { status: 400 });
    }
    const cleanPassword = passwordCheck.value;

    // 3. Authentication Rate Limiting (Max 8 attempts per 15 mins per IP + Account)
    const rateLimitKey = `${clientIp}:${cleanEmail}`;
    const rateLimitResult = checkAuthRateLimit(rateLimitKey);

    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        {
          message: `Too many login attempts. Account temporarily locked. Please try again in ${rateLimitResult.retryAfterSeconds} seconds.`,
          retryAfter: rateLimitResult.retryAfterSeconds,
        },
        { status: 429 }
      );
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    await connectDB();

    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      const response = NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    const isMatch = await bcrypt.compare(cleanPassword, user.passwordHash);

    if (!isMatch) {
      const response = NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    const response = NextResponse.json({
      message: "Login successful",
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        rollNo: user.rollNo,
        role: user.role,
        hostel: user.hostel || "KP-7A",
        isSocietyLead: user.isSocietyLead || false,
        society: user.society,
        position: user.position,
        allocatedRoom: user.allocatedRoom,
      },
    });

    setRateLimitHeaders(response.headers, rateLimitResult);

    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60, // 15 minutes
    });

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error("Login Server Error:", error);
    return NextResponse.json(
      { message: "An internal server error occurred.", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 }
    );
  }
}
