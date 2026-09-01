import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { generateAccessToken } from "@/lib/jwt";
import { cookies } from "next/headers";

const REFRESH_SECRET = process.env.REFRESH_SECRET!;

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refreshToken")?.value;

    if (!refreshToken) {
      return NextResponse.json({ message: "No refresh token" }, { status: 401 });
    }

    await connectDB();

    // Verify token
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    } catch (err) {
      return NextResponse.json({ message: "Invalid refresh token" }, { status: 403 });
    }

    // Check if user exists and has this token
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    // Generate new access token
    const accessToken = generateAccessToken(user);

    const response = NextResponse.json({ message: "Token refreshed" });
    
    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
