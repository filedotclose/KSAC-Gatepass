import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Pass from "@/models/Pass";
import ActivityLog from "@/models/ActivityLog";
import { getUserFromToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getUserFromToken();
    if (!user || user.role !== "warden") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { passId } = await req.json();
    if (!passId) {
      return NextResponse.json({ message: "Pass ID required" }, { status: 400 });
    }

    await connectDB();

    const pass = await Pass.findById(passId);
    if (!pass) {
      return NextResponse.json({ message: "Pass not found" }, { status: 404 });
    }

    if (pass.status !== "APPROVED") {
      return NextResponse.json({ message: "Student must have APPROVED status to exit hostel" }, { status: 400 });
    }

    pass.hostelOutTime = new Date();
    await pass.save();

    // Create Activity Log
    await ActivityLog.create({
      studentId: pass.studentId,
      passId: pass._id,
      activityType: "HOSTEL_EXIT",
      location: "Hostel Main Gate"
    });

    return NextResponse.json(pass);
  } catch (error) {
    console.error("Hostel exit error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
