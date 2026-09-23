import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import KSACRegistry from "@/models/KSACRegistry";
import { getUserFromToken } from "@/lib/auth";
import { getClientIp, checkGeneralRateLimit, setRateLimitHeaders } from "@/lib/rateLimit";
import { sanitizeString } from "@/lib/sanitize";

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
    if (!user || (user.role !== "ksac" && user.role !== "dean" && user.role !== "warden")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rawDate = searchParams.get("date");
    const dateCheck = sanitizeString(rawDate, 20, "Date");
    const date = dateCheck.value || new Date().toISOString().split("T")[0];

    await connectDB();

    const registry = await KSACRegistry.find({ date })
      .sort({ inTime: -1 });

    const response = NextResponse.json(registry);
    setRateLimitHeaders(response.headers, rateLimitResult);
    return response;
  } catch (error: any) {
    console.error("Fetch KSAC registry error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
