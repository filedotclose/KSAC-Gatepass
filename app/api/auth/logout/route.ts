import { NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";

export async function POST() {
  await connectDB();
  const user = await getUserFromToken();
  if (user && user.role === "student") {
    const AttendanceSession = (await import("@/models/AttendanceSession")).default;
    const activeSession = await AttendanceSession.findOne({ status: "ACTIVE", loginLocked: true });
    if (activeSession) {
      return NextResponse.json(
        { message: "Logout is temporarily locked during an active attendance session." },
        { status: 423 }
      );
    }
  }

  const response = NextResponse.json({ message: "Logged out successfully" });

  response.cookies.set("accessToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });

  response.cookies.set("refreshToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });

  return response;
}
