import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Pass from "@/models/Pass";
import ActivityLog from "@/models/ActivityLog";
import KSACRegistry from "@/models/KSACRegistry";
import { getUserFromToken } from "@/lib/auth";
import { getClientIp, checkGeneralRateLimit, setRateLimitHeaders } from "@/lib/rateLimit";
import { parseAndValidateBody, isValidMongoId } from "@/lib/sanitize";

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
    if (!user || user.role !== "ksac") {
      return NextResponse.json({ message: "Unauthorized: KSAC Authority role required." }, { status: 401 });
    }

    const bodyResult = await parseAndValidateBody<{ passId?: unknown }>(req);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const { passId } = bodyResult.data;
    if (!isValidMongoId(passId)) {
      return NextResponse.json({ message: "Invalid Pass ID format." }, { status: 400 });
    }

    await connectDB();

    const pass = await Pass.findById(passId);
    if (!pass) {
      return NextResponse.json({ message: "Pass not found." }, { status: 404 });
    }

    if (pass.status !== "IN_KSAC") {
      return NextResponse.json({ message: "Student must be IN_KSAC to mark departure." }, { status: 400 });
    }

    pass.ksacOutTime = new Date();
    await pass.save();

    // Create Activity Log
    await ActivityLog.create({
      studentId: pass.studentId,
      passId: pass._id,
      activityType: "KSAC_EXIT",
      location: "KSAC Exit Gate",
    });

    // Update KSAC Registry Entry
    await KSACRegistry.findOneAndUpdate(
      { passId: pass._id },
      { outTime: pass.ksacOutTime }
    );

    const response = NextResponse.json(pass);
    setRateLimitHeaders(response.headers, rateLimitResult);
    return response;
  } catch (error: any) {
    console.error("KSAC exit error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
