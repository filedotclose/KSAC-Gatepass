import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollNo: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ["student", "warden", "ksac"],
    required: true,
  },
  isSocietyLead: { type: Boolean, default: false },
  society: { type: String },
  position: { type: String }, // "President" | "Vice-President"
  allocatedRoom: { type: String },
  societyPositions: [
    {
      society: { type: String, required: true },
      position: { type: String, required: true },
      allocatedRoom: { type: String },
    },
  ],
  refreshToken: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Optimization Indexes
userSchema.index({ role: 1 });
userSchema.index({ isSocietyLead: 1 });
userSchema.index({ society: 1 });

export default mongoose.models.user || mongoose.model("user", userSchema);