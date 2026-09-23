import mongoose from "mongoose";

const attendanceRecordSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "attendanceSession", required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  name: { type: String, required: true },
  rollNo: { type: String, required: true },
  phoneNo: { type: String },
  hostelName: { type: String, required: true },
  scannedAt: { type: Date, default: Date.now },
  confirmedAt: { type: Date },
  qrSequence: { type: Number, required: true },
});

// Ensure a student can only mark attendance once per session
attendanceRecordSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

export default mongoose.models.attendanceRecord || mongoose.model("attendanceRecord", attendanceRecordSchema);
