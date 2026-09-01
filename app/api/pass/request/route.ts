import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Pass from "@/models/Pass";
import { getUserFromToken } from "@/lib/auth";
import { getClientIp, checkGeneralRateLimit, setRateLimitHeaders } from "@/lib/rateLimit";
import { parseAndValidateBody, sanitizeString } from "@/lib/sanitize";

export async function POST(req: Request) {
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
    if (!user || user.role !== "student") {
      return NextResponse.json({ message: "Unauthorized: Student session required." }, { status: 401 });
    }

    const bodyResult = await parseAndValidateBody<{
      reason?: unknown;
      society?: unknown;
      requestedExtension?: unknown;
    }>(req);

    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const { reason, society, requestedExtension } = bodyResult.data;

    // Sanitize inputs
    const societyCheck = sanitizeString(society, 100, "Society");
    if (!societyCheck.valid || !societyCheck.value) {
      return NextResponse.json(
        { message: "Please specify a valid KSAC Society or Activity." },
        { status: 400 }
      );
    }

    const reasonCheck = sanitizeString(reason, 500, "Reason");
    const extensionCheck = sanitizeString(requestedExtension, 20, "Requested Extension");

    await connectDB();

    // Check if there's already an active pass
    const activePass = await Pass.findOne({
      studentId: user._id,
      status: { $in: ["PENDING", "APPROVED", "IN_KSAC"] },
    });

    if (activePass) {
      return NextResponse.json(
        { message: "You already have an active GatePass request." },
        { status: 400 }
      );
    }

    const newPass = await Pass.create({
      studentId: user._id,
      society: societyCheck.value,
      reason: reasonCheck.value || "KSAC Society Activity",
      requestedExtension: extensionCheck.value || "09:30 PM",
      status: "PENDING",
    });

    const response = NextResponse.json(newPass, { status: 201 });
    setRateLimitHeaders(response.headers, rateLimitResult);
    return response;
  } catch (error: any) {
    console.error("Pass request error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
