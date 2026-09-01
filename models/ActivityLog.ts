import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  passId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "pass",
    required: true,
  },
  activityType: {
    type: String,
    enum: ["HOSTEL_EXIT", "KSAC_ENTRY", "KSAC_EXIT", "HOSTEL_ENTRY"],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  location: {
    type: String,
    required: true,
  }
});

// Index for performance when querying logs by student
activityLogSchema.index({ studentId: 1, timestamp: -1 });

export default mongoose.models.activityLog || mongoose.model("activityLog", activityLogSchema);
