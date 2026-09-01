import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Pass from "@/models/Pass";
import { getUserFromToken } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    let query = {};
    if (user.role === "student") {
      query = { studentId: user._id };
    } else if (user.role === "warden") {
      // Warden sees all passes to track history and active movements
      query = {}; 
    } else if (user.role === "ksac") {
      // KSAC authorities see students approved (in transit / expected) or in KSAC
      query = { status: { $in: ["APPROVED", "IN_KSAC"] } };
    }

    const passes = await Pass.find(query)
      .populate("studentId", "name rollNo email")
      .sort({ createdAt: -1 });

    return NextResponse.json(passes);
  } catch (error) {
    console.error("Fetch passes error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
