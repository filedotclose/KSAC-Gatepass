import mongoose from "mongoose";

const attendanceSessionSchema = new mongoose.Schema({
  eventName: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  status: { type: String, enum: ["ACTIVE", "COMPLETED"], default: "ACTIVE" },
  loginLocked: { type: Boolean, default: false },
  qrSecret: { type: String, required: true },
  currentSequence: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  recipientEmail: { type: String },
});

// Index for active session queries
attendanceSessionSchema.index({ status: 1, loginLocked: 1 });

export default mongoose.models.attendanceSession || mongoose.model("attendanceSession", attendanceSessionSchema);
