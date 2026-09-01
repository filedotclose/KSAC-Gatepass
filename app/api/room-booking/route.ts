import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import RoomBooking from "@/models/RoomBooking";
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
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const statusFilter = sanitizeString(searchParams.get("status"), 20, "Status").value;
    const dateFilter = sanitizeString(searchParams.get("date"), 20, "Date").value;
    const roomFilter = sanitizeString(searchParams.get("room"), 100, "Room").value;
    const societyFilter = sanitizeString(searchParams.get("society"), 100, "Society").value;

    let query: any = {};

    if (user.role === "student") {
      // Data Isolation: Students only view their own bookings
      query.studentId = user._id;
      if (statusFilter && statusFilter !== "ALL") query.status = statusFilter;
      if (dateFilter) query.date = dateFilter;
    } else if (user.role === "ksac") {
      // KSAC Authority can view all bookings with filters
      if (statusFilter && statusFilter !== "ALL") query.status = statusFilter;
      if (dateFilter) query.date = dateFilter;
      if (roomFilter && roomFilter !== "ALL") query.room = roomFilter;
      if (societyFilter && societyFilter !== "ALL") query.society = societyFilter;
    } else {
      // Warden does not manage KSAC room bookings
      return NextResponse.json(
        { message: "Access restricted to KSAC Authority and Society Leaders." },
        { status: 403 }
      );
    }

    const bookings = await RoomBooking.find(query)
      .populate("studentId", "name rollNo email society position")
      .populate("actionBy", "name rollNo email")
      .sort({ createdAt: -1 });

    const response = NextResponse.json(bookings);
    setRateLimitHeaders(response.headers, rateLimitResult);
    return response;
  } catch (error: any) {
    console.error("Fetch room bookings error:", error);
    return NextResponse.json(
      { message: "Server error fetching room bookings" },
      { status: 500 }
    );
  }
}
