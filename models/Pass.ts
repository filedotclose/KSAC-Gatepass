import mongoose from "mongoose";

const passSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  status: {
    type: String,
    enum: ["PENDING", "APPROVED", "IN_KSAC", "RETURNED", "REJECTED"],
    default: "PENDING",
  },
  // KSAC Metadata
  society: {
    type: String,
    required: true,
    default: "General KSAC Activity",
  },
  requestedExtension: {
    type: String,
    default: "09:30 PM",
  },
  reason: {
    type: String,
    default: "KSAC Society Session",
  },

  // Timestamps for the state machine
  hostelOutTime: { type: Date },
  ksacInTime: { type: Date },
  ksacOutTime: { type: Date },
  hostelInTime: { type: Date },
  
  createdAt: { type: Date, default: Date.now },
});

// Optimization Indexes
passSchema.index({ status: 1 });
passSchema.index({ studentId: 1, status: 1 });
passSchema.index({ createdAt: -1 });

// Virtuals for travel time
passSchema.virtual("transitToKSAC").get(function() {
  if (this.hostelOutTime && this.ksacInTime) {
    return Math.floor((this.ksacInTime.getTime() - this.hostelOutTime.getTime()) / 60000);
  }
  return null;
});

passSchema.virtual("transitToHostel").get(function() {
  if (this.ksacOutTime && this.hostelInTime) {
    return Math.floor((this.hostelInTime.getTime() - this.ksacOutTime.getTime()) / 60000);
  }
  return null;
});

passSchema.virtual("ksacDuration").get(function() {
  if (this.ksacInTime && this.ksacOutTime) {
    return Math.floor((this.ksacOutTime.getTime() - this.ksacInTime.getTime()) / 60000);
  }
  return null;
});

passSchema.set("toJSON", { virtuals: true });
passSchema.set("toObject", { virtuals: true });

export default mongoose.models.pass || mongoose.model("pass", passSchema);
