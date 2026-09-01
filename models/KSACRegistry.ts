import mongoose from "mongoose";

const ksacRegistrySchema = new mongoose.Schema({
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
  date: {
    type: String, // Format: YYYY-MM-DD for easy day-wise grouping
    required: true,
  },
  name: { type: String, required: true },
  rollNo: { type: String, required: true },
  society: { type: String, required: true },
  inTime: { type: Date, default: Date.now },
  outTime: { type: Date },
});

// Index for performance when querying logs by date or student
ksacRegistrySchema.index({ date: 1, studentId: 1 });
ksacRegistrySchema.index({ society: 1, date: 1 });

export default mongoose.models.ksacRegistry || mongoose.model("ksacRegistry", ksacRegistrySchema);
