import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Pass from "@/models/Pass";
import { getUserFromToken } from "@/lib/auth";
import { getClientIp, checkGeneralRateLimit, setRateLimitHeaders } from "@/lib/rateLimit";

export async function GET(req: Request) {
  try {
    const clientIp = getClientIp(req);
    const rateLimitResult = checkGeneralRateLimit(clientIp);
    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        { message: `Too many requests. Rate limit exceeded. Try again in ${rateLimitResult.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    let query = {};
    if (user.role === "student") {
      query = { studentId: user._id };
    } else if (user.role === "warden") {
      query = {};
    } else if (user.role === "ksac") {
      query = { status: { $in: ["APPROVED", "IN_KSAC"] } };
    }

    const passes = await Pass.find(query)
      .populate("studentId", "name rollNo email")
      .sort({ createdAt: -1 });

    const response = NextResponse.json(passes);
    setRateLimitHeaders(response.headers, rateLimitResult);
    return response;
  } catch (error: any) {
    console.error("Fetch passes error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
