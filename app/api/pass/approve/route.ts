import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Pass from "@/models/Pass";
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

    if (pass.status !== "PENDING") {
      return NextResponse.json({ message: "Pass cannot be approved in current state" }, { status: 400 });
    }

    pass.status = "APPROVED";
    await pass.save();

    return NextResponse.json(pass);
  } catch (error) {
    console.error("Pass approval error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
