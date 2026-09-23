import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import User from "@/models/User";
import Pass from "@/models/Pass";
import RoomBooking from "@/models/RoomBooking";
import ActivityLog from "@/models/ActivityLog";
import KSACRegistry from "@/models/KSACRegistry";
import AttendanceSession from "@/models/AttendanceSession";
import AttendanceRecord from "@/models/AttendanceRecord";
import { generateQRToken, validateQRToken } from "@/lib/qrToken";
import { generateAttendanceExcel, sendAttendanceEmail } from "@/lib/attendance-email";
import crypto from "crypto";
import bcrypt from "bcryptjs";
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
        .populate("studentId", "name rollNo email hostel")
        .sort({ createdAt: -1 });

      let bookings: any[] = [];
      if (user.isSocietyLead) {
        bookings = await RoomBooking.find({ studentId: user._id })
          .populate("studentId", "name rollNo email society position hostel")
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
      if (user.role !== "student" && user.role !== "admin") {
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
        hostel: user.hostel || "KP-7A",
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
      if ((user.role !== "student" || !user.isSocietyLead) && user.role !== "admin") {
        return NextResponse.json(
          { message: "Access Restricted: Exclusively available to verified Society Presidents and Vice-Presidents." },
          { status: 403 }
        );
      }

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

      const firstAuth = authorizedMap.values().next().value || { society: user.society || "KSAC Society", position: user.position || "Lead" };

      const { society, room, date, startTime, endTime, purpose, attendeesEstimate } = payload || {};
      const roomCheck = sanitizeString(room, 100, "Room");
      const dateCheck = sanitizeString(date, 20, "Date");
      const startCheck = sanitizeString(startTime, 20, "Start Time");
      const endCheck = sanitizeString(endTime, 20, "End Time");
      const purposeCheck = sanitizeString(purpose, 500, "Purpose");

      if (!roomCheck.valid || !roomCheck.value || !dateCheck.valid || !dateCheck.value || !startCheck.valid || !startCheck.value || !endCheck.valid || !endCheck.value || !purposeCheck.valid || !purposeCheck.value) {
        return NextResponse.json({ message: "Missing required booking details." }, { status: 400 });
      }

      let targetAuth = firstAuth;
      const reqSocCheck = sanitizeString(society, 100, "Society");
      if (reqSocCheck.valid && reqSocCheck.value && authorizedMap.has(reqSocCheck.value.trim().toLowerCase())) {
        targetAuth = authorizedMap.get(reqSocCheck.value.trim().toLowerCase())!;
      }

      const validation = validateBookingTimeWindow(startCheck.value, endCheck.value);
      if (!validation.valid || validation.startMinutes == null || validation.endMinutes == null) {
        return NextResponse.json({ message: validation.error || "Invalid booking time window." }, { status: 400 });
      }

      const { startMinutes, endMinutes, durationMinutes, formattedTimeslot } = validation;

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

    // OP 0x04: ACTION ROOM BOOKING (Approve/Reject by KSAC Authority, Dean or Admin)
    if (op === GATEWAY_OPCODES.ACTION_ROOM_BOOKING) {
      if (user.role !== "ksac" && user.role !== "dean" && user.role !== "admin") {
        return NextResponse.json({ message: "Access restricted: KSAC Authority or Dean role required." }, { status: 403 });
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

    // OP 0x05: ACTION PASS APPROVE / REJECT (Step 3: KSAC Authority Verifies & Accepts)
    if (op === GATEWAY_OPCODES.ACTION_PASS_APPROVE) {
      if (user.role !== "ksac" && user.role !== "dean" && user.role !== "admin") {
        return NextResponse.json({ message: "Unauthorized: KSAC Authority or Dean verification required." }, { status: 403 });
      }

      const { passId, action = "APPROVE", note } = payload || {};
      if (!isValidMongoId(passId)) {
        return NextResponse.json({ message: "Invalid Pass ID." }, { status: 400 });
      }

      const pass = await Pass.findById(passId).populate("studentId");
      if (!pass || pass.status !== "PENDING") {
        return NextResponse.json({ message: "Pass not found or not in PENDING state." }, { status: 404 });
      }

      if (action === "REJECT") {
        pass.status = "REJECTED";
        pass.rejectionReason = sanitizeString(note, 300, "Note").value || "Rejected by KSAC Authority";
        pass.ksacActionBy = user._id;
        await pass.save();
      } else {
        // KSAC accepts and verifies the pass
        pass.status = "APPROVED";
        pass.ksacApprovedAt = new Date();
        pass.ksacInTime = new Date();
        pass.ksacActionBy = user._id;
        await pass.save();

        await ActivityLog.create({
          studentId: (pass.studentId as any)._id,
          passId: pass._id,
          activityType: "KSAC_VERIFIED",
          location: "KSAC Central Authority Desk",
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
      }

      const response = NextResponse.json(pass);
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    // OP 0x06: RECORD GATE MOVEMENT (Step 5: Warden confirms hostel entry when student returns)
    if (op === GATEWAY_OPCODES.RECORD_GATE_MOVEMENT) {
      const { passId, movementType } = payload || {};
      if (!isValidMongoId(passId)) {
        return NextResponse.json({ message: "Invalid Pass ID." }, { status: 400 });
      }

      const pass = await Pass.findById(passId).populate("studentId");
      if (!pass) {
        return NextResponse.json({ message: "Pass not found." }, { status: 404 });
      }

      // Warden confirms student is back in hostel
      if (movementType === "HOSTEL_ENTRY" && (user.role === "warden" || user.role === "admin")) {
        if (pass.status !== "APPROVED" && pass.status !== "IN_KSAC") {
          return NextResponse.json({ message: "Student must have an active approved pass." }, { status: 400 });
        }
        pass.status = "RETURNED";
        pass.hostelInTime = new Date();
        pass.wardenActionBy = user._id;
        if (!pass.ksacOutTime) {
          pass.ksacOutTime = new Date();
        }
        await pass.save();

        await ActivityLog.create({
          studentId: (pass.studentId as any)._id,
          passId: pass._id,
          activityType: "HOSTEL_ENTRY",
          location: `${pass.hostel || "Hostel"} Main Gate`,
        });

        await KSACRegistry.findOneAndUpdate({ passId: pass._id }, { outTime: pass.hostelInTime });
      } else {
        return NextResponse.json({ message: "Unauthorized movement action." }, { status: 403 });
      }

      const response = NextResponse.json(pass);
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    // OP 0x07: FETCH KSAC REGISTRY
    if (op === GATEWAY_OPCODES.FETCH_KSAC_REGISTRY) {
      if (user.role !== "ksac" && user.role !== "dean" && user.role !== "warden" && user.role !== "admin") {
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
      if (user.role !== "warden" && user.role !== "admin") {
        return NextResponse.json({ message: "Unauthorized." }, { status: 403 });
      }

      // Wardens see passes (filterable by their hostel if set)
      const query: any = {};
      if (user.role === "warden" && user.hostel && user.hostel !== "ALL") {
        query.hostel = user.hostel;
      }

      const passes = await Pass.find(query)
        .populate("studentId", "name rollNo email hostel")
        .sort({ createdAt: -1 });

      const response = NextResponse.json(passes);
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    // OP 0x09: FETCH KSAC PASSES & ROOM BOOKINGS
    if (op === GATEWAY_OPCODES.FETCH_KSAC_PASSES) {
      if (user.role !== "ksac" && user.role !== "dean" && user.role !== "admin") {
        return NextResponse.json({ message: "Unauthorized." }, { status: 403 });
      }

      // KSAC gets all passes (Pending requests to verify, Active verified passes, and Returned history)
      const passes = await Pass.find({})
        .populate("studentId", "name rollNo email hostel")
        .populate("wardenActionBy", "name rollNo")
        .sort({ createdAt: -1 });

      const bookings = await RoomBooking.find({})
        .populate("studentId", "name rollNo email society position hostel")
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

    // =============================================================
    // MASTER ADMIN CRUD OPCODES (0x0B - 0x12)
    // =============================================================

    // OP 0x0B: FETCH ADMIN DASHBOARD
    if (op === GATEWAY_OPCODES.FETCH_ADMIN_DASHBOARD) {
      if (user.role !== "admin") {
        return NextResponse.json({ message: "Access Denied: Master Admin privilege required." }, { status: 403 });
      }

      const [users, passes, bookings, activityLogs] = await Promise.all([
        User.find({}).select("-passwordHash").sort({ createdAt: -1 }),
        Pass.find({}).populate("studentId", "name rollNo email hostel").sort({ createdAt: -1 }),
        RoomBooking.find({}).populate("studentId", "name rollNo email society position hostel").sort({ createdAt: -1 }),
        ActivityLog.find({}).populate("studentId", "name rollNo").sort({ timestamp: -1 }).limit(50),
      ]);

      const stats = {
        totalUsers: users.length,
        totalStudents: users.filter((u) => u.role === "student").length,
        totalLeads: users.filter((u) => u.isSocietyLead).length,
        totalPasses: passes.length,
        activePasses: passes.filter((p) => p.status === "APPROVED" || p.status === "IN_KSAC").length,
        pendingPasses: passes.filter((p) => p.status === "PENDING").length,
        returnedPasses: passes.filter((p) => p.status === "RETURNED").length,
        totalBookings: bookings.length,
        pendingBookings: bookings.filter((b) => b.status === "PENDING").length,
        approvedBookings: bookings.filter((b) => b.status === "APPROVED").length,
      };

      const response = NextResponse.json({ users, passes, bookings, activityLogs, stats });
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    // OP 0x0C: ADMIN CREATE USER
    if (op === GATEWAY_OPCODES.ADMIN_CREATE_USER) {
      if (user.role !== "admin") {
        return NextResponse.json({ message: "Access Denied: Master Admin privilege required." }, { status: 403 });
      }

      const { name, rollNo, email, password, role = "student", hostel = "KP-7A", isSocietyLead = false, society, position, allocatedRoom } = payload || {};
      const nameCheck = sanitizeString(name, 100, "Name");
      const rollNoCheck = sanitizeString(rollNo, 30, "Roll No");
      const emailCheck = sanitizeString(email, 100, "Email");
      const passwordCheck = sanitizeString(password, 100, "Password");

      if (!nameCheck.valid || !nameCheck.value || !rollNoCheck.valid || !rollNoCheck.value || !emailCheck.valid || !emailCheck.value) {
        return NextResponse.json({ message: "Valid name, roll number, and official email required." }, { status: 400 });
      }

      const cleanEmail = emailCheck.value.toLowerCase().trim();
      if (!cleanEmail.endsWith("@kiit.ac.in")) {
        return NextResponse.json({ message: "Email must be an official @kiit.ac.in address." }, { status: 400 });
      }

      const existingUser = await User.findOne({
        $or: [{ email: cleanEmail }, { rollNo: rollNoCheck.value }],
      });
      if (existingUser) {
        return NextResponse.json({ message: "User with this roll number or email already exists." }, { status: 409 });
      }

      const rawPassword = passwordCheck.value || "password123";
      const passwordHash = await bcrypt.hash(rawPassword, 10);

      const newUser = await User.create({
        name: nameCheck.value,
        rollNo: rollNoCheck.value,
        email: cleanEmail,
        passwordHash,
        role: ["student", "warden", "ksac", "dean", "admin"].includes(role) ? role : "student",
        hostel: sanitizeString(hostel, 50, "Hostel").value || "KP-7A",
        isSocietyLead: Boolean(isSocietyLead),
        society: sanitizeString(society, 100, "Society").value,
        position: sanitizeString(position, 50, "Position").value,
        allocatedRoom: sanitizeString(allocatedRoom, 100, "Allocated Room").value,
      });

      const response = NextResponse.json({ message: "User created successfully.", user: newUser }, { status: 201 });
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    // OP 0x0D: ADMIN UPDATE USER
    if (op === GATEWAY_OPCODES.ADMIN_UPDATE_USER) {
      if (user.role !== "admin") {
        return NextResponse.json({ message: "Access Denied: Master Admin privilege required." }, { status: 403 });
      }

      const { userId, name, rollNo, email, role, hostel, isSocietyLead, society, position, allocatedRoom, password } = payload || {};
      if (!isValidMongoId(userId)) {
        return NextResponse.json({ message: "Invalid User ID." }, { status: 400 });
      }

      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return NextResponse.json({ message: "User not found." }, { status: 404 });
      }

      if (name) targetUser.name = sanitizeString(name, 100, "Name").value || targetUser.name;
      if (rollNo) targetUser.rollNo = sanitizeString(rollNo, 30, "Roll No").value || targetUser.rollNo;
      if (email) {
        const cleanEmail = sanitizeString(email, 100, "Email").value?.toLowerCase().trim();
        if (cleanEmail && cleanEmail.endsWith("@kiit.ac.in")) {
          targetUser.email = cleanEmail;
        }
      }
      if (role && ["student", "warden", "ksac", "dean", "admin"].includes(role)) {
        targetUser.role = role;
      }
      if (hostel) {
        targetUser.hostel = sanitizeString(hostel, 50, "Hostel").value || targetUser.hostel;
      }
      if (typeof isSocietyLead === "boolean") {
        targetUser.isSocietyLead = isSocietyLead;
      }
      if (society !== undefined) {
        targetUser.society = sanitizeString(society, 100, "Society").value;
      }
      if (position !== undefined) {
        targetUser.position = sanitizeString(position, 50, "Position").value;
      }
      if (allocatedRoom !== undefined) {
        targetUser.allocatedRoom = sanitizeString(allocatedRoom, 100, "Allocated Room").value;
      }
      if (password) {
        const cleanPassword = sanitizeString(password, 100, "Password").value;
        if (cleanPassword && cleanPassword.length >= 6) {
          targetUser.passwordHash = await bcrypt.hash(cleanPassword, 10);
        }
      }

      await targetUser.save();

      const response = NextResponse.json({ message: "User updated successfully.", user: targetUser });
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    // OP 0x0E: ADMIN DELETE USER
    if (op === GATEWAY_OPCODES.ADMIN_DELETE_USER) {
      if (user.role !== "admin") {
        return NextResponse.json({ message: "Access Denied: Master Admin privilege required." }, { status: 403 });
      }

      const { userId } = payload || {};
      if (!isValidMongoId(userId)) {
        return NextResponse.json({ message: "Invalid User ID." }, { status: 400 });
      }

      if (userId === user._id) {
        return NextResponse.json({ message: "Self-deletion of active admin is restricted." }, { status: 400 });
      }

      await User.findByIdAndDelete(userId);
      await Pass.deleteMany({ studentId: userId });
      await RoomBooking.deleteMany({ studentId: userId });

      const response = NextResponse.json({ message: "User and associated records deleted." });
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    // OP 0x0F: ADMIN DELETE PASS
    if (op === GATEWAY_OPCODES.ADMIN_DELETE_PASS) {
      if (user.role !== "admin") {
        return NextResponse.json({ message: "Access Denied: Master Admin privilege required." }, { status: 403 });
      }

      const { passId } = payload || {};
      if (!isValidMongoId(passId)) {
        return NextResponse.json({ message: "Invalid Pass ID." }, { status: 400 });
      }

      await Pass.findByIdAndDelete(passId);
      const response = NextResponse.json({ message: "Pass deleted." });
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    // OP 0x10: ADMIN DELETE ROOM BOOKING
    if (op === GATEWAY_OPCODES.ADMIN_DELETE_BOOKING) {
      if (user.role !== "admin") {
        return NextResponse.json({ message: "Access Denied: Master Admin privilege required." }, { status: 403 });
      }

      const { bookingId } = payload || {};
      if (!isValidMongoId(bookingId)) {
        return NextResponse.json({ message: "Invalid Booking ID." }, { status: 400 });
      }

      await RoomBooking.findByIdAndDelete(bookingId);
      const response = NextResponse.json({ message: "Booking deleted." });
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    // OP 0x11: ADMIN OVERRIDE PASS STATUS
    if (op === GATEWAY_OPCODES.ADMIN_OVERRIDE_PASS) {
      if (user.role !== "admin") {
        return NextResponse.json({ message: "Access Denied: Master Admin privilege required." }, { status: 403 });
      }

      const { passId, status, requestedExtension } = payload || {};
      if (!isValidMongoId(passId) || !["PENDING", "APPROVED", "IN_KSAC", "RETURNED", "REJECTED"].includes(status)) {
        return NextResponse.json({ message: "Invalid Pass ID or target status." }, { status: 400 });
      }

      const pass = await Pass.findById(passId);
      if (!pass) {
        return NextResponse.json({ message: "Pass not found." }, { status: 404 });
      }

      pass.status = status;
      if (requestedExtension) pass.requestedExtension = requestedExtension;
      if (status === "APPROVED" && !pass.ksacApprovedAt) {
        pass.ksacApprovedAt = new Date();
        pass.ksacInTime = new Date();
      }
      if (status === "RETURNED" && !pass.hostelInTime) {
        pass.hostelInTime = new Date();
      }

      await pass.save();
      const response = NextResponse.json({ message: "Pass status overridden by admin.", pass });
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    // OP 0x12: ADMIN OVERRIDE BOOKING STATUS
    if (op === GATEWAY_OPCODES.ADMIN_OVERRIDE_BOOKING) {
      if (user.role !== "admin") {
        return NextResponse.json({ message: "Access Denied: Master Admin privilege required." }, { status: 403 });
      }

      const { bookingId, status, note } = payload || {};
      if (!isValidMongoId(bookingId) || !["PENDING", "APPROVED", "REJECTED"].includes(status)) {
        return NextResponse.json({ message: "Invalid Booking ID or target status." }, { status: 400 });
      }

      const booking = await RoomBooking.findById(bookingId);
      if (!booking) {
        return NextResponse.json({ message: "Booking not found." }, { status: 404 });
      }

      booking.status = status;
      if (note) booking.actionNote = note;
      booking.actionBy = user._id;
      booking.actionTimestamp = new Date();
      await booking.save();

      const response = NextResponse.json({ message: "Booking status overridden by admin.", booking });
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }
    // =============================================================
    // DEAN & ATTENDANCE OPCODES (0x20 - 0x27)
    // =============================================================

    // OP 0x20: FETCH DEAN DASHBOARD
    if (op === GATEWAY_OPCODES.FETCH_DEAN_DASHBOARD) {
      if (user.role !== "dean" && user.role !== "admin") {
        return NextResponse.json({ message: "Unauthorized." }, { status: 403 });
      }

      const passes = await Pass.find({})
        .populate("studentId", "name rollNo email hostel")
        .populate("wardenActionBy", "name rollNo")
        .sort({ createdAt: -1 });

      const bookings = await RoomBooking.find({})
        .populate("studentId", "name rollNo email society position hostel")
        .populate("actionBy", "name rollNo email")
        .sort({ createdAt: -1 });

      const sessions = await AttendanceSession.find({})
        .sort({ createdAt: -1 });

      const response = NextResponse.json({ passes, bookings, sessions });
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    // OP 0x21: CREATE ATTENDANCE SESSION
    if (op === GATEWAY_OPCODES.CREATE_ATTENDANCE_SESSION) {
      if (user.role !== "dean" && user.role !== "admin") {
        return NextResponse.json({ message: "Unauthorized." }, { status: 403 });
      }

      const { eventName, recipientEmail } = payload || {};
      const eventNameCheck = sanitizeString(eventName, 100, "Event Name");
      if (!eventNameCheck.valid || !eventNameCheck.value) {
        return NextResponse.json({ message: "Event Name is required." }, { status: 400 });
      }

      const activeSession = await AttendanceSession.findOne({ status: "ACTIVE" });
      if (activeSession) {
        return NextResponse.json({ message: "An attendance session is already active." }, { status: 409 });
      }

      let cleanRecipientEmail = process.env.ATTENDANCE_RECIPIENT_EMAIL || "work.sujalagarwal@gmail.com";
      if (typeof recipientEmail === "string" && recipientEmail.trim()) {
        const trimmed = recipientEmail.trim().toLowerCase();
        if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
          cleanRecipientEmail = trimmed;
        }
      }

      const qrSecret = crypto.randomBytes(32).toString("hex");

      const session = await AttendanceSession.create({
        eventName: eventNameCheck.value,
        createdBy: user._id,
        recipientEmail: cleanRecipientEmail,
        qrSecret,
        status: "ACTIVE",
      });

      const response = NextResponse.json({ session });
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    // OP 0x22: TOGGLE LOGIN LOCK
    if (op === GATEWAY_OPCODES.TOGGLE_LOGIN_LOCK) {
      if (user.role !== "dean" && user.role !== "admin") {
        return NextResponse.json({ message: "Unauthorized." }, { status: 403 });
      }

      const { sessionId, lock } = payload || {};
      if (!isValidMongoId(sessionId)) {
        return NextResponse.json({ message: "Invalid Session ID." }, { status: 400 });
      }

      const session = await AttendanceSession.findOne({ _id: sessionId, status: "ACTIVE" });
      if (!session) {
        return NextResponse.json({ message: "Active session not found." }, { status: 404 });
      }

      session.loginLocked = Boolean(lock);
      await session.save();

      const response = NextResponse.json({ session });
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    // OP 0x23: GENERATE QR TOKEN
    if (op === GATEWAY_OPCODES.GENERATE_QR_TOKEN) {
      if (user.role !== "dean" && user.role !== "admin") {
        return NextResponse.json({ message: "Unauthorized." }, { status: 403 });
      }

      const { sessionId } = payload || {};
      if (!isValidMongoId(sessionId)) {
        return NextResponse.json({ message: "Invalid Session ID." }, { status: 400 });
      }

      const session = await AttendanceSession.findOne({ _id: sessionId, status: "ACTIVE" });
      if (!session) {
        return NextResponse.json({ message: "Active session not found." }, { status: 404 });
      }
      
      // Ensure login lock is active before generating QR for security
      if (!session.loginLocked) {
        return NextResponse.json({ message: "Please lock login/logout before generating QR." }, { status: 400 });
      }

      session.currentSequence += 1;
      await session.save();

      const { token, tsBucket } = generateQRToken(session.qrSecret, session._id.toString(), session.currentSequence);

      const response = NextResponse.json({
        sessionId: session._id.toString(),
        sequence: session.currentSequence,
        token,
        tsBucket,
      });
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    // OP 0x24: SCAN QR ATTENDANCE
    if (op === GATEWAY_OPCODES.SCAN_QR_ATTENDANCE) {
      if (user.role !== "student") {
        return NextResponse.json({ message: "Only students can mark attendance." }, { status: 403 });
      }

      const { sessionId, sequence, tsBucket, token } = payload || {};
      if (!isValidMongoId(sessionId)) {
        return NextResponse.json({ message: "Invalid Session ID." }, { status: 400 });
      }

      const session = await AttendanceSession.findOne({ _id: sessionId, status: "ACTIVE" });
      if (!session) {
        return NextResponse.json({ message: "Attendance session is no longer active." }, { status: 404 });
      }

      const isValid = validateQRToken(
        session.qrSecret,
        session._id.toString(),
        session.currentSequence,
        sequence,
        tsBucket,
        token
      );

      if (!isValid) {
        return NextResponse.json({ message: "Invalid or expired QR code. Please scan the latest one." }, { status: 400 });
      }

      // Check if already scanned
      const existing = await AttendanceRecord.findOne({ sessionId: session._id, studentId: user._id });
      if (existing) {
        return NextResponse.json({ message: "You have already marked your attendance.", record: existing });
      }

      const record = await AttendanceRecord.create({
        sessionId: session._id,
        studentId: user._id,
        name: user.name,
        rollNo: user.rollNo,
        hostelName: user.hostel,
        qrSequence: sequence,
      });

      const response = NextResponse.json({ record });
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    // OP 0x25: CONFIRM ATTENDANCE
    if (op === GATEWAY_OPCODES.CONFIRM_ATTENDANCE) {
      if (user.role !== "student") {
        return NextResponse.json({ message: "Unauthorized." }, { status: 403 });
      }

      const { recordId, sessionId, phoneNo, phone } = payload || {};
      const actualPhone = phoneNo || phone;

      const query: any = { studentId: user._id };
      if (recordId && isValidMongoId(recordId)) {
        query._id = recordId;
      } else if (sessionId && isValidMongoId(sessionId)) {
        query.sessionId = sessionId;
      } else {
        return NextResponse.json({ message: "Valid Record ID or Session ID required." }, { status: 400 });
      }

      const record = await AttendanceRecord.findOne(query);
      if (!record) {
        return NextResponse.json({ message: "Attendance record not found." }, { status: 404 });
      }

      if (record.confirmedAt) {
        return NextResponse.json({ message: "Already confirmed.", record });
      }

      record.phoneNo = sanitizeString(actualPhone, 20, "Phone No").value;
      record.confirmedAt = new Date();
      await record.save();

      const response = NextResponse.json({ record });
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    // OP 0x26: END ATTENDANCE SESSION
    if (op === GATEWAY_OPCODES.END_ATTENDANCE_SESSION) {
      if (user.role !== "dean" && user.role !== "admin") {
        return NextResponse.json({ message: "Unauthorized." }, { status: 403 });
      }

      const { sessionId } = payload || {};
      if (!isValidMongoId(sessionId)) {
        return NextResponse.json({ message: "Invalid Session ID." }, { status: 400 });
      }

      const session = await AttendanceSession.findOne({ _id: sessionId, status: "ACTIVE" });
      if (!session) {
        return NextResponse.json({ message: "Active session not found." }, { status: 404 });
      }

      session.status = "COMPLETED";
      session.completedAt = new Date();
      session.loginLocked = false;
      await session.save();

      // Fetch all confirmed records
      const records = await AttendanceRecord.find({ sessionId: session._id, confirmedAt: { $ne: null } })
        .sort({ scannedAt: 1 });

      const durationMinutes = Math.round((session.completedAt.getTime() - session.startedAt.getTime()) / 60000);

      // Generate Excel and Send Email (fire and forget for now, or await)
      try {
        const excelBuffer = await generateAttendanceExcel(session.eventName, records);
        await sendAttendanceEmail(
          session.eventName,
          session.recipientEmail,
          excelBuffer,
          records.length,
          durationMinutes
        );
      } catch (e) {
        console.error("Failed to generate/send attendance email", e);
        // We still complete the session even if email fails, UI will handle
      }

      const response = NextResponse.json({ session, totalRecords: records.length });
      setRateLimitHeaders(response.headers, rateLimitResult);
      return response;
    }

    // OP 0x27: FETCH ATTENDANCE STATUS
    if (op === GATEWAY_OPCODES.FETCH_ATTENDANCE_STATUS) {
      const session = await AttendanceSession.findOne({ status: "ACTIVE" });
      if (!session) {
        return NextResponse.json({ active: false });
      }

      let userRecord = null;
      if (user.role === "student") {
        userRecord = await AttendanceRecord.findOne({ sessionId: session._id, studentId: user._id });
      }

      const response = NextResponse.json({ 
        active: true, 
        session: { _id: session._id, eventName: session.eventName, loginLocked: session.loginLocked },
        userRecord 
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
