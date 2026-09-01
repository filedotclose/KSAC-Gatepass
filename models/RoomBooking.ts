import mongoose from "mongoose";

const roomBookingSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  studentName: {
    type: String,
    required: true,
  },
  studentRollNo: {
    type: String,
    required: true,
  },
  society: {
    type: String,
    required: true,
  },
  position: {
    type: String,
    required: true,
  },
  room: {
    type: String,
    required: true,
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true,
  },
  startTime: {
    type: String, // e.g. "02:00 PM"
    required: true,
  },
  endTime: {
    type: String, // e.g. "04:30 PM"
    required: true,
  },
  startMinutes: {
    type: Number, // minutes from midnight (e.g. 840)
    required: true,
  },
  endMinutes: {
    type: Number, // minutes from midnight (e.g. 990)
    required: true,
  },
  durationMinutes: {
    type: Number, // e.g. 150
    required: true,
  },
  timeslot: {
    type: String, // Format: e.g. "02:00 PM - 04:30 PM"
    required: true,
  },
  purpose: {
    type: String,
    required: true,
  },
  attendeesEstimate: {
    type: Number,
    default: 15,
  },
  status: {
    type: String,
    enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
    default: "PENDING",
  },
  actionBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  actionNote: {
    type: String,
  },
  actionTimestamp: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound indexes for time-range overlap detection, duplicate prevention, and queries
roomBookingSchema.index({ room: 1, date: 1, status: 1, startMinutes: 1, endMinutes: 1 });
roomBookingSchema.index({ studentId: 1, date: 1, status: 1 });
roomBookingSchema.index({ status: 1, date: 1 });
roomBookingSchema.index({ society: 1, date: 1 });

export default mongoose.models.roomBooking || mongoose.model("roomBooking", roomBookingSchema);
