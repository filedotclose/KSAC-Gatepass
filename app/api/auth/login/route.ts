import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import {
  generateAccessToken,
  generateRefreshToken,
} from "@/lib/jwt";

export async function POST(req: Request) {
  try {
    console.log("Login API started");
    await connectDB();
    console.log("DB connected");

    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("JSON parse error:", e);
      return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
    }

    const { email, password } = body;
    console.log("Login attempt for:", email);

    if (!email || !password) {
      return NextResponse.json(
        { message: "Missing credentials" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email });
    console.log("User found:", user ? "Yes" : "No");

    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    console.log("Comparing passwords...");
    const isMatch = await bcrypt.compare(
      password,
      user.passwordHash
    );
    console.log("Password match:", isMatch);

    if (!isMatch) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    console.log("Generating tokens...");
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    console.log("Tokens generated");

    user.refreshToken = refreshToken;
    await user.save();
    console.log("User token saved");

    const response = NextResponse.json({
      message: "Login successful",
    });

    response.cookies.set("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    console.log("Login successful, returning response");
    return response;
  } catch (error: any) {
    console.error("CRITICAL Login Error:", error);
    return NextResponse.json(
      { message: "Server error", detail: error.message },
      { status: 500 }
    );
  }
}
