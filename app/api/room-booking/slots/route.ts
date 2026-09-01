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

    const { searchParams } = new URL(req.url);
    const rawRoom = searchParams.get("room");
    const rawDate = searchParams.get("date");

    const roomCheck = sanitizeString(rawRoom, 100, "Room");
    const dateCheck = sanitizeString(rawDate, 20, "Date");

    if (!roomCheck.valid || !roomCheck.value || !dateCheck.valid || !dateCheck.value) {
      return NextResponse.json(
        { message: "Valid Room and Date parameters are required." },
        { status: 400 }
      );
    }

    const room = roomCheck.value;
    const date = dateCheck.value;

    await connectDB();

    // Fetch active bookings (PENDING or APPROVED) for this room & date
    const activeBookings = await RoomBooking.find({
      room,
      date,
      status: { $in: ["PENDING", "APPROVED"] },
    })
      .select("startTime endTime startMinutes endMinutes timeslot society status")
      .sort({ startMinutes: 1 });

    const response = NextResponse.json({
      room,
      date,
      bookedIntervals: activeBookings,
    });
    setRateLimitHeaders(response.headers, rateLimitResult);
    return response;
  } catch (error: any) {
    console.error("Fetch room slots error:", error);
    return NextResponse.json(
      { message: "Server error fetching slots" },
      { status: 500 }
    );
  }
}
