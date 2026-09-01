import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import RoomBooking from "@/models/RoomBooking";
import { getUserFromToken } from "@/lib/auth";
import { getClientIp, checkGeneralRateLimit, setRateLimitHeaders } from "@/lib/rateLimit";
import { parseAndValidateBody, isValidMongoId, sanitizeString } from "@/lib/sanitize";

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
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Access control: Only KSAC Authority can approve / reject room bookings
    if (user.role !== "ksac") {
      return NextResponse.json(
        { message: "Access restricted: Only KSAC Authority desk can approve or reject room bookings." },
        { status: 403 }
      );
    }

    const bodyResult = await parseAndValidateBody<{
      bookingId?: unknown;
      action?: unknown;
      note?: unknown;
    }>(req);

    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const { bookingId, action, note } = bodyResult.data;

    if (!isValidMongoId(bookingId)) {
      return NextResponse.json({ message: "Invalid booking ID format." }, { status: 400 });
    }

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json(
        { message: 'Invalid action. Must be "APPROVE" or "REJECT".' },
        { status: 400 }
      );
    }

    const noteCheck = sanitizeString(note, 300, "Note");
    const cleanNote = noteCheck.value;

    await connectDB();

    const booking = await RoomBooking.findById(bookingId);
    if (!booking) {
      return NextResponse.json({ message: "Room booking not found." }, { status: 404 });
    }

    if (booking.status !== "PENDING") {
      return NextResponse.json(
        { message: `Booking has already been marked as ${booking.status}.` },
        { status: 400 }
      );
    }

    if (action === "APPROVE") {
      // Concurrency check: Ensure no conflicting booking has been approved for the same room/date/time range
      const conflictingApproved = await RoomBooking.findOne({
        _id: { $ne: booking._id },
        room: booking.room,
        date: booking.date,
        status: "APPROVED",
        startMinutes: { $lt: booking.endMinutes },
        endMinutes: { $gt: booking.startMinutes },
      });

      if (conflictingApproved) {
        return NextResponse.json(
          {
            message: `Cannot approve: Room "${booking.room}" has already been approved for ${conflictingApproved.society} (${conflictingApproved.timeslot}) on ${booking.date}.`,
          },
          { status: 409 }
        );
      }

      booking.status = "APPROVED";
      booking.actionBy = user._id;
      booking.actionNote = cleanNote || "Approved by KSAC Authority";
      booking.actionTimestamp = new Date();
      await booking.save();

      const response = NextResponse.json({
        message: "Room booking successfully approved.",
        booking,
      });
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    } else {
      booking.status = "REJECTED";
      booking.actionBy = user._id;
      booking.actionNote = cleanNote || "Booking rejected by KSAC Authority";
      booking.actionTimestamp = new Date();
      await booking.save();

      const response = NextResponse.json({
        message: "Room booking rejected.",
        booking,
      });
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }
  } catch (error: any) {
    console.error("Room booking action error:", error);
    return NextResponse.json(
      { message: "Server error processing booking action" },
      { status: 500 }
    );
  }
}
