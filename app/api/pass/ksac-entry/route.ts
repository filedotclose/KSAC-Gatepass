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

    const pass = await Pass.findById(passId).populate("studentId");
    if (!pass) {
      return NextResponse.json({ message: "Pass not found." }, { status: 404 });
    }

    if (pass.status !== "APPROVED") {
      return NextResponse.json({ message: "Invalid pass status for KSAC entry." }, { status: 400 });
    }

    if (!pass.hostelOutTime) {
      return NextResponse.json({ message: "Student must have exited the hostel before KSAC check-in." }, { status: 400 });
    }

    pass.status = "IN_KSAC";
    pass.ksacInTime = new Date();
    await pass.save();

    // Create Activity Log
    await ActivityLog.create({
      studentId: (pass.studentId as any)._id,
      passId: pass._id,
      activityType: "KSAC_ENTRY",
      location: "KSAC Main Reception",
    });

    // Create KSAC Registry Entry
    await KSACRegistry.create({
      studentId: (pass.studentId as any)._id,
      passId: pass._id,
      date: new Date().toISOString().split("T")[0],
      name: (pass.studentId as any).name,
      rollNo: (pass.studentId as any).rollNo,
      society: pass.society || "General Activity",
      inTime: pass.ksacInTime,
    });

    const response = NextResponse.json(pass);
    setRateLimitHeaders(response.headers, rateLimitResult);
    return response;
  } catch (error: any) {
    console.error("KSAC entry error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
