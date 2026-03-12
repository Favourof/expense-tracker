const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["manual", "bank"], default: "manual" },
    provider: { type: String, default: "manual" },
    accountName: { type: String },
    accountNumberMask: { type: String },
    status: { type: String, enum: ["active", "disconnected"], default: "active" },
    metadata: { type: Object },
  },
  { timestamps: true }
);

accountSchema.index({ userId: 1, provider: 1 });

module.exports = mongoose.model("Account", accountSchema);
