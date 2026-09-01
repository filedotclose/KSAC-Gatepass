import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Pass from "@/models/Pass";
import ActivityLog from "@/models/ActivityLog";
import KSACRegistry from "@/models/KSACRegistry";
import { getUserFromToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getUserFromToken();
    if (!user || user.role !== "ksac") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { passId } = await req.json();
    if (!passId) {
      return NextResponse.json({ message: "Pass ID required" }, { status: 400 });
    }

    await connectDB();

    const pass = await Pass.findById(passId).populate("studentId");
    if (!pass) {
      return NextResponse.json({ message: "Pass not found" }, { status: 404 });
    }

    if (pass.status !== "APPROVED") {
      return NextResponse.json({ message: "Invalid pass status for KSAC entry" }, { status: 400 });
    }

    if (!pass.hostelOutTime) {
      return NextResponse.json({ message: "Student must have exited the hostel before KSAC check-in" }, { status: 400 });
    }

    pass.status = "IN_KSAC";
    pass.ksacInTime = new Date();
    await pass.save();

    // Create Activity Log
    await ActivityLog.create({
      studentId: pass.studentId._id,
      passId: pass._id,
      activityType: "KSAC_ENTRY",
      location: "KSAC Main Reception"
    });

    // Create KSAC Registry Entry
    await KSACRegistry.create({
      studentId: pass.studentId._id,
      passId: pass._id,
      date: new Date().toISOString().split("T")[0],
      name: pass.studentId.name,
      rollNo: pass.studentId.rollNo,
      society: pass.society || "General Activity",
      inTime: pass.ksacInTime
    });

    return NextResponse.json(pass);
  } catch (error) {
    console.error("KSAC entry error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
