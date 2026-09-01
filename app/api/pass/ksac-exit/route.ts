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

    const pass = await Pass.findById(passId);
    if (!pass) {
      return NextResponse.json({ message: "Pass not found" }, { status: 404 });
    }

    if (pass.status !== "IN_KSAC") {
      return NextResponse.json({ message: "Student must be IN_KSAC to mark departure" }, { status: 400 });
    }

    pass.ksacOutTime = new Date();
    // Keep status as IN_KSAC or transit back to hostel until warden confirms hostel re-entry
    await pass.save();

    // Create Activity Log
    await ActivityLog.create({
      studentId: pass.studentId,
      passId: pass._id,
      activityType: "KSAC_EXIT",
      location: "KSAC Exit Gate"
    });

    // Update KSAC Registry Entry
    await KSACRegistry.findOneAndUpdate(
      { passId: pass._id },
      { outTime: pass.ksacOutTime }
    );

    return NextResponse.json(pass);
  } catch (error) {
    console.error("KSAC exit error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
