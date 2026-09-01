import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import Pass from "@/models/Pass";
import RoomBooking from "@/models/RoomBooking";
import ActivityLog from "@/models/ActivityLog";
import KSACRegistry from "@/models/KSACRegistry";
import { validateBookingTimeWindow } from "@/lib/ksacSocieties";
import { getClientIp, checkGeneralRateLimit, setRateLimitHeaders } from "@/lib/rateLimit";
import { parseAndValidateBody, isValidMongoId, sanitizeString } from "@/lib/sanitize";
import {
  deobfuscatePayload,
  obfuscatePayload,
  validateGatewayNonce,
  GATEWAY_OPCODES,
} from "@/lib/clientSecurity";

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
      return NextResponse.json({ message: "Unauthorized session." }, { status: 401 });
    }

    const bodyResult = await parseAndValidateBody<{
      op?: unknown;
      data?: unknown;
      nonce?: unknown;
      ts?: unknown;
    }>(req);

    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const { op, data: rawPayload, nonce, ts } = bodyResult.data;

    // Validate anti-replay nonce and timestamp if provided
    if (typeof nonce === "string" && typeof ts === "number") {
      const nonceCheck = validateGatewayNonce(nonce, ts);
      if (!nonceCheck.valid) {
        return NextResponse.json({ message: nonceCheck.error }, { status: 400 });
      }
    }

    // Decode deobfuscated payload if transmitted in obfuscated format
    let payload: any = rawPayload;
    if (typeof rawPayload === "string") {
      const decoded = deobfuscatePayload(rawPayload);
      if (decoded !== null) {
        payload = decoded;
      }
    }

    await connectDB();

    // -------------------------------------------------------------
    // DISPATCH BASED ON OPAQUE OPCODES
    // -------------------------------------------------------------

    // OP 0x01: FETCH STUDENT DASHBOARD (Passes & Room Bookings)
    if (op === GATEWAY_OPCODES.FETCH_STUDENT_DASHBOARD) {
      const passes = await Pass.find({ studentId: user._id })
        .populate("studentId", "name rollNo email")
        .sort({ createdAt: -1 });

      let bookings: any[] = [];
      if (user.isSocietyLead) {
        bookings = await RoomBooking.find({ studentId: user._id })
          .populate("studentId", "name rollNo email society position")
          .populate("actionBy", "name rollNo email")
          .sort({ createdAt: -1 });
      }

      const response = NextResponse.json({
        d: obfuscatePayload({ passes, bookings }),
        passes,
        bookings,
      });
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    // OP 0x02: REQUEST GATEPASS
    if (op === GATEWAY_OPCODES.REQUEST_GATEPASS) {
      if (user.role !== "student") {
        return NextResponse.json({ message: "Unauthorized: Student session required." }, { status: 403 });
      }

      const { reason, society, requestedExtension } = payload || {};
      const societyCheck = sanitizeString(society, 100, "Society");
      if (!societyCheck.valid || !societyCheck.value) {
        return NextResponse.json({ message: "Valid society/activity required." }, { status: 400 });
      }

      const activePass = await Pass.findOne({
        studentId: user._id,
        status: { $in: ["PENDING", "APPROVED", "IN_KSAC"] },
      });

      if (activePass) {
        return NextResponse.json({ message: "You already have an active GatePass request." }, { status: 400 });
      }

      const reasonCheck = sanitizeString(reason, 500, "Reason");
      const extensionCheck = sanitizeString(requestedExtension, 20, "Extension");

      const newPass = await Pass.create({
        studentId: user._id,
        society: societyCheck.value,
        reason: reasonCheck.value || "KSAC Society Activity",
        requestedExtension: extensionCheck.value || "09:30 PM",
        status: "PENDING",
      });

      const response = NextResponse.json(newPass, { status: 201 });
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    // OP 0x03: REQUEST ROOM BOOKING
    if (op === GATEWAY_OPCODES.REQUEST_ROOM_BOOKING) {
      if (user.role !== "student" || !user.isSocietyLead) {
        return NextResponse.json(
          { message: "Access Restricted: Exclusively available to verified Society Presidents and Vice-Presidents." },
          { status: 403 }
        );
      }

      // Build authorized societies map
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

      const firstAuth = authorizedMap.values().next().value;
      if (!firstAuth) {
        return NextResponse.json({ message: "No authorized society assigned to your leadership profile." }, { status: 403 });
      }

      const { society, room, date, startTime, endTime, purpose, attendeesEstimate } = payload || {};
      const roomCheck = sanitizeString(room, 100, "Room");
      const dateCheck = sanitizeString(date, 20, "Date");
      const startCheck = sanitizeString(startTime, 20, "Start Time");
      const endCheck = sanitizeString(endTime, 20, "End Time");
      const purposeCheck = sanitizeString(purpose, 500, "Purpose");

      if (!roomCheck.valid || !roomCheck.value || !dateCheck.valid || !dateCheck.value || !startCheck.valid || !startCheck.value || !endCheck.valid || !endCheck.value || !purposeCheck.valid || !purposeCheck.value) {
        return NextResponse.json({ message: "Missing required booking details." }, { status: 400 });
      }

      // Match designation strictly
      let targetAuth: { society: string; position: string } = firstAuth;
      const reqSocCheck = sanitizeString(society, 100, "Society");
      if (reqSocCheck.valid && reqSocCheck.value) {
        const matched = authorizedMap.get(reqSocCheck.value.trim().toLowerCase());
        if (!matched) {
          const allowedList = Array.from(authorizedMap.values()).map((v) => `"${v.society}" (${v.position})`).join(", ");
          return NextResponse.json(
            { message: `Access Denied: You are only authorized to submit room bookings for your designated society (${allowedList}).` },
            { status: 403 }
          );
        }
        targetAuth = matched;
      }

      const validation = validateBookingTimeWindow(startCheck.value, endCheck.value);
      if (!validation.valid || validation.startMinutes == null || validation.endMinutes == null) {
        return NextResponse.json({ message: validation.error || "Invalid booking time window." }, { status: 400 });
      }

      const { startMinutes, endMinutes, durationMinutes, formattedTimeslot } = validation;

      // Duplicate & overlap collision check
      const studentOverlap = await RoomBooking.findOne({
        studentId: user._id,
        date: dateCheck.value,
        status: { $in: ["PENDING", "APPROVED"] },
        startMinutes: { $lt: endMinutes },
        endMinutes: { $gt: startMinutes },
      });

      if (studentOverlap) {
        return NextResponse.json(
          { message: `Redundant booking: You already have an active (${studentOverlap.status}) booking (${studentOverlap.timeslot}) on ${dateCheck.value}.` },
          { status: 400 }
        );
      }

      const roomConflict = await RoomBooking.findOne({
        room: roomCheck.value,
        date: dateCheck.value,
        status: { $in: ["PENDING", "APPROVED"] },
        startMinutes: { $lt: endMinutes },
        endMinutes: { $gt: startMinutes },
      });

      if (roomConflict) {
        return NextResponse.json(
          { message: `Slot Conflict: "${roomCheck.value}" is already reserved by ${roomConflict.society} (${roomConflict.status}: ${roomConflict.timeslot}) on ${dateCheck.value}.` },
          { status: 409 }
        );
      }

      const newBooking = await RoomBooking.create({
        studentId: user._id,
        studentName: user.name,
        studentRollNo: user.rollNo,
        society: targetAuth.society,
        position: targetAuth.position,
        room: roomCheck.value,
        date: dateCheck.value,
        startTime: startCheck.value,
        endTime: endCheck.value,
        startMinutes,
        endMinutes,
        durationMinutes,
        timeslot: formattedTimeslot,
        purpose: purposeCheck.value,
        attendeesEstimate: Math.min(500, Math.max(1, Number(attendeesEstimate) || 15)),
        status: "PENDING",
      });

      const response = NextResponse.json(newBooking, { status: 201 });
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    // OP 0x04: ACTION ROOM BOOKING (Approve/Reject by KSAC Authority)
    if (op === GATEWAY_OPCODES.ACTION_ROOM_BOOKING) {
      if (user.role !== "ksac") {
        return NextResponse.json({ message: "Access restricted: KSAC Authority role required." }, { status: 403 });
      }

      const { bookingId, action, note } = payload || {};
      if (!isValidMongoId(bookingId) || (action !== "APPROVE" && action !== "REJECT")) {
        return NextResponse.json({ message: "Invalid booking ID or action." }, { status: 400 });
      }

      const booking = await RoomBooking.findById(bookingId);
      if (!booking || booking.status !== "PENDING") {
        return NextResponse.json({ message: "Booking not found or already processed." }, { status: 404 });
      }

      if (action === "APPROVE") {
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
            { message: `Cannot approve: Room "${booking.room}" has already been approved for ${conflictingApproved.society} on ${booking.date}.` },
            { status: 409 }
          );
        }

        booking.status = "APPROVED";
        booking.actionBy = user._id;
        booking.actionNote = sanitizeString(note, 300, "Note").value || "Approved by KSAC Authority";
        booking.actionTimestamp = new Date();
        await booking.save();
      } else {
        booking.status = "REJECTED";
        booking.actionBy = user._id;
        booking.actionNote = sanitizeString(note, 300, "Note").value || "Booking rejected by KSAC Authority";
        booking.actionTimestamp = new Date();
        await booking.save();
      }

      const response = NextResponse.json({ message: "Booking updated.", booking });
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    // OP 0x05: ACTION PASS APPROVE (Warden)
    if (op === GATEWAY_OPCODES.ACTION_PASS_APPROVE) {
      if (user.role !== "warden") {
        return NextResponse.json({ message: "Unauthorized: Warden role required." }, { status: 403 });
      }

      const { passId } = payload || {};
      if (!isValidMongoId(passId)) {
        return NextResponse.json({ message: "Invalid Pass ID." }, { status: 400 });
      }

      const pass = await Pass.findById(passId);
      if (!pass || pass.status !== "PENDING") {
        return NextResponse.json({ message: "Pass not found or not in PENDING state." }, { status: 404 });
      }

      pass.status = "APPROVED";
      await pass.save();

      const response = NextResponse.json(pass);
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    // OP 0x06: RECORD GATE MOVEMENT (Hostel Exit / Entry, KSAC Entry / Exit)
    if (op === GATEWAY_OPCODES.RECORD_GATE_MOVEMENT) {
      const { passId, movementType } = payload || {};
      if (!isValidMongoId(passId)) {
        return NextResponse.json({ message: "Invalid Pass ID." }, { status: 400 });
      }

      const pass = await Pass.findById(passId).populate("studentId");
      if (!pass) {
        return NextResponse.json({ message: "Pass not found." }, { status: 404 });
      }

      if (movementType === "HOSTEL_EXIT" && user.role === "warden") {
        if (pass.status !== "APPROVED") {
          return NextResponse.json({ message: "Student must have APPROVED status to exit hostel." }, { status: 400 });
        }
        pass.hostelOutTime = new Date();
        await pass.save();
        await ActivityLog.create({
          studentId: (pass.studentId as any)._id,
          passId: pass._id,
          activityType: "HOSTEL_EXIT",
          location: "Hostel Main Gate",
        });
      } else if (movementType === "KSAC_ENTRY" && user.role === "ksac") {
        if (pass.status !== "APPROVED" || !pass.hostelOutTime) {
          return NextResponse.json({ message: "Student must have exited hostel before KSAC entry." }, { status: 400 });
        }
        pass.status = "IN_KSAC";
        pass.ksacInTime = new Date();
        await pass.save();
        await ActivityLog.create({
          studentId: (pass.studentId as any)._id,
          passId: pass._id,
          activityType: "KSAC_ENTRY",
          location: "KSAC Main Reception",
        });
        await KSACRegistry.create({
          studentId: (pass.studentId as any)._id,
          passId: pass._id,
          date: new Date().toISOString().split("T")[0],
          name: (pass.studentId as any).name,
          rollNo: (pass.studentId as any).rollNo,
          society: pass.society || "General Activity",
          inTime: pass.ksacInTime,
        });
      } else if (movementType === "KSAC_EXIT" && user.role === "ksac") {
        if (pass.status !== "IN_KSAC") {
          return NextResponse.json({ message: "Student must be IN_KSAC to mark departure." }, { status: 400 });
        }
        pass.ksacOutTime = new Date();
        await pass.save();
        await ActivityLog.create({
          studentId: (pass.studentId as any)._id,
          passId: pass._id,
          activityType: "KSAC_EXIT",
          location: "KSAC Exit Gate",
        });
        await KSACRegistry.findOneAndUpdate({ passId: pass._id }, { outTime: pass.ksacOutTime });
      } else if (movementType === "HOSTEL_ENTRY" && user.role === "warden") {
        if (!pass.hostelOutTime) {
          return NextResponse.json({ message: "Student must have exited hostel first." }, { status: 400 });
        }
        pass.status = "RETURNED";
        pass.hostelInTime = new Date();
        await pass.save();
        await ActivityLog.create({
          studentId: (pass.studentId as any)._id,
          passId: pass._id,
          activityType: "HOSTEL_ENTRY",
          location: "Hostel Main Gate",
        });
      } else {
        return NextResponse.json({ message: "Unauthorized movement action." }, { status: 403 });
      }

      const response = NextResponse.json(pass);
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    // OP 0x07: FETCH KSAC REGISTRY
    if (op === GATEWAY_OPCODES.FETCH_KSAC_REGISTRY) {
      if (user.role !== "ksac" && user.role !== "warden") {
        return NextResponse.json({ message: "Unauthorized." }, { status: 403 });
      }
      const rawDate = sanitizeString(payload?.date, 20, "Date").value || new Date().toISOString().split("T")[0];
      const registry = await KSACRegistry.find({ date: rawDate }).sort({ inTime: -1 });

      const response = NextResponse.json(registry);
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    // OP 0x08: FETCH WARDEN PASSES
    if (op === GATEWAY_OPCODES.FETCH_WARDEN_PASSES) {
      if (user.role !== "warden") {
        return NextResponse.json({ message: "Unauthorized." }, { status: 403 });
      }
      const passes = await Pass.find({})
        .populate("studentId", "name rollNo email")
        .sort({ createdAt: -1 });

      const response = NextResponse.json(passes);
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    // OP 0x09: FETCH KSAC PASSES & ROOM BOOKINGS
    if (op === GATEWAY_OPCODES.FETCH_KSAC_PASSES) {
      if (user.role !== "ksac") {
        return NextResponse.json({ message: "Unauthorized." }, { status: 403 });
      }
      const passes = await Pass.find({ status: { $in: ["APPROVED", "IN_KSAC"] } })
        .populate("studentId", "name rollNo email")
        .sort({ createdAt: -1 });

      const bookings = await RoomBooking.find({})
        .populate("studentId", "name rollNo email society position")
        .populate("actionBy", "name rollNo email")
        .sort({ createdAt: -1 });

      const response = NextResponse.json({ passes, bookings });
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    // OP 0x0A: FETCH ROOM SLOTS
    if (op === GATEWAY_OPCODES.FETCH_ROOM_SLOTS) {
      const { room, date } = payload || {};
      const roomClean = sanitizeString(room, 100, "Room").value;
      const dateClean = sanitizeString(date, 20, "Date").value;

      if (!roomClean || !dateClean) {
        return NextResponse.json({ message: "Room and Date required." }, { status: 400 });
      }

      const activeBookings = await RoomBooking.find({
        room: roomClean,
        date: dateClean,
        status: { $in: ["PENDING", "APPROVED"] },
      })
        .select("startTime endTime startMinutes endMinutes timeslot society status")
        .sort({ startMinutes: 1 });

      const response = NextResponse.json({
        room: roomClean,
        date: dateClean,
        bookedIntervals: activeBookings,
      });
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    return NextResponse.json({ message: "Unknown operation opcode." }, { status: 400 });
  } catch (error: any) {
    console.error("Gateway execution error:", error);
    return NextResponse.json({ message: "Gateway processing error." }, { status: 500 });
  }
}
