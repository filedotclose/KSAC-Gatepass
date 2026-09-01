import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import RoomBooking from "@/models/RoomBooking";
import { getUserFromToken } from "@/lib/auth";
import { validateBookingTimeWindow } from "@/lib/ksacSocieties";
import { getClientIp, checkGeneralRateLimit, setRateLimitHeaders } from "@/lib/rateLimit";
import { parseAndValidateBody, sanitizeString } from "@/lib/sanitize";

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

    if (user.role !== "student") {
      return NextResponse.json(
        { message: "Only students with verified Society Leadership access can submit room bookings." },
        { status: 403 }
      );
    }

    // Access Control: Only verified Presidents and Vice-Presidents (isSocietyLead === true)
    if (!user.isSocietyLead) {
      return NextResponse.json(
        {
          message:
            "Access Restricted: KSAC Room Booking is exclusively available to verified Society Presidents and Vice-Presidents. Regular students are not authorized to book rooms.",
        },
        { status: 403 }
      );
    }

    // Build the authorized societies and designations for this user from authentic DB profile
    const authorizedMap = new Map<string, { society: string; position: string }>();

    if (user.societyPositions && Array.isArray(user.societyPositions) && user.societyPositions.length > 0) {
      for (const sp of user.societyPositions) {
        if (sp.society) {
          authorizedMap.set(sp.society.trim().toLowerCase(), {
            society: sp.society.trim(),
            position: sp.position || "Office Bearer",
          });
        }
      }
    }

    if (user.society) {
      authorizedMap.set(user.society.trim().toLowerCase(), {
        society: user.society.trim(),
        position: user.position || "Office Bearer",
      });
    }

    if (authorizedMap.size === 0) {
      return NextResponse.json(
        { message: "Access Denied: No authorized society assigned to your leadership profile." },
        { status: 403 }
      );
    }

    const bodyResult = await parseAndValidateBody<{
      society?: unknown;
      room?: unknown;
      date?: unknown;
      startTime?: unknown;
      endTime?: unknown;
      timeslot?: unknown;
      purpose?: unknown;
      attendeesEstimate?: unknown;
    }>(req);

    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const { society, room, date, startTime, endTime, timeslot, purpose, attendeesEstimate } = bodyResult.data;

    // Determine start and end times
    let rawStartTime = typeof startTime === "string" ? startTime : undefined;
    let rawEndTime = typeof endTime === "string" ? endTime : undefined;

    if ((!rawStartTime || !rawEndTime) && typeof timeslot === "string" && timeslot.includes("-")) {
      const parts = timeslot.split("-").map((s: string) => s.trim());
      rawStartTime = parts[0];
      rawEndTime = parts[1];
    }

    // Sanitize string inputs
    const reqSocCheck = sanitizeString(society, 100, "Society");
    const roomCheck = sanitizeString(room, 100, "Room");
    const dateCheck = sanitizeString(date, 20, "Date");
    const startCheck = sanitizeString(rawStartTime, 20, "Start Time");
    const endCheck = sanitizeString(rawEndTime, 20, "End Time");
    const purposeCheck = sanitizeString(purpose, 500, "Purpose");

    if (
      !roomCheck.valid || !roomCheck.value ||
      !dateCheck.valid || !dateCheck.value ||
      !startCheck.valid || !startCheck.value ||
      !endCheck.valid || !endCheck.value ||
      !purposeCheck.valid || !purposeCheck.value
    ) {
      return NextResponse.json(
        { message: "Missing or invalid required booking details (room, date, startTime, endTime, purpose)." },
        { status: 400 }
      );
    }

    // Designation and Society Enforcement:
    // If a society was requested, it MUST strictly match one of the user's authorized societies
    const firstAuth = authorizedMap.values().next().value;
    if (!firstAuth) {
      return NextResponse.json(
        { message: "Access Denied: No authorized society assigned to your leadership profile." },
        { status: 403 }
      );
    }

    let targetAuth: { society: string; position: string } = firstAuth;
    if (reqSocCheck.valid && reqSocCheck.value) {
      const matched = authorizedMap.get(reqSocCheck.value.trim().toLowerCase());
      if (!matched) {
        const allowedList = Array.from(authorizedMap.values()).map((v) => `"${v.society}" (${v.position})`).join(", ");
        return NextResponse.json(
          {
            message: `Access Denied: You are only authorized to submit room bookings for your designated society (${allowedList}). You cannot submit bookings for other societies.`,
          },
          { status: 403 }
        );
      }
      targetAuth = matched;
    }

    const finalSociety = targetAuth.society;
    const finalPosition = targetAuth.position;
    const finalDate = dateCheck.value;
    const finalStartTime = startCheck.value;
    const finalEndTime = endCheck.value;
    const finalRoom = roomCheck.value;
    const finalPurpose = purposeCheck.value;

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(finalDate)) {
      return NextResponse.json(
        { message: "Invalid date format. Expected YYYY-MM-DD." },
        { status: 400 }
      );
    }

    // Validate Time Window (>= 1 hour, <= 7:00 PM cutoff, >= 8:00 AM)
    const validation = validateBookingTimeWindow(finalStartTime, finalEndTime);
    if (!validation.valid || validation.startMinutes == null || validation.endMinutes == null) {
      return NextResponse.json(
        { message: validation.error || "Invalid booking time window." },
        { status: 400 }
      );
    }

    const { startMinutes, endMinutes, durationMinutes, formattedTimeslot } = validation;

    await connectDB();

    // 1. Redundant booking check for the same student:
    // Check if this student already has an active overlapping reservation on this date
    const existingStudentOverlap = await RoomBooking.findOne({
      studentId: user._id,
      date: finalDate,
      status: { $in: ["PENDING", "APPROVED"] },
      startMinutes: { $lt: endMinutes },
      endMinutes: { $gt: startMinutes },
    });

    if (existingStudentOverlap) {
      return NextResponse.json(
        {
          message: `Redundant booking: You already have an active (${existingStudentOverlap.status}) room booking (${existingStudentOverlap.timeslot}) overlapping with ${formattedTimeslot} on ${finalDate}.`,
        },
        { status: 400 }
      );
    }

    // 2. Room Slot Overlap / Conflict check:
    // Check if target room is already booked or pending during an overlapping time window on that date
    const roomConflict = await RoomBooking.findOne({
      room: finalRoom,
      date: finalDate,
      status: { $in: ["PENDING", "APPROVED"] },
      startMinutes: { $lt: endMinutes },
      endMinutes: { $gt: startMinutes },
    });

    if (roomConflict) {
      return NextResponse.json(
        {
          message: `Slot Conflict: "${finalRoom}" is already reserved by ${roomConflict.society} (${roomConflict.status}: ${roomConflict.timeslot}) on ${finalDate}. Please select another time window or room.`,
        },
        { status: 409 }
      );
    }

    // Create the room booking with strictly authenticated society & designation
    const newBooking = await RoomBooking.create({
      studentId: user._id,
      studentName: user.name,
      studentRollNo: user.rollNo,
      society: finalSociety,
      position: finalPosition,
      room: finalRoom,
      date: finalDate,
      startTime: finalStartTime,
      endTime: finalEndTime,
      startMinutes,
      endMinutes,
      durationMinutes,
      timeslot: formattedTimeslot,
      purpose: finalPurpose,
      attendeesEstimate: Math.min(500, Math.max(1, Number(attendeesEstimate) || 15)),
      status: "PENDING",
    });

    const response = NextResponse.json(newBooking, { status: 201 });
    setRateLimitHeaders(response.headers, rateLimitResult);
    return response;
  } catch (error: any) {
    console.error("Room booking request error:", error);
    return NextResponse.json(
      { message: "Server error creating room booking" },
      { status: 500 }
    );
  }
}
