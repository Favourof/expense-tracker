const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      default: null,
    },
    type: {
      type: String,
      enum: ["income", "expense", "transfer"],
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "NGN" },
    timestamp: { type: Date, default: Date.now },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    subcategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    source: { type: String, enum: ["manual", "bank"], default: "manual" },
    merchant: { type: String },
    label: { type: String },
    note: { type: String },
    tags: [{ type: String }],
    externalId: { type: String },
    idempotencyKey: { type: String },
    status: {
      type: String,
      enum: ["posted", "pending", "reversed"],
      default: "posted",
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

transactionSchema.index({ userId: 1, timestamp: -1 });
transactionSchema.index({ userId: 1, type: 1, timestamp: -1 });
transactionSchema.index({ userId: 1, categoryId: 1 });
transactionSchema.index({ externalId: 1 }, { unique: true, sparse: true });
transactionSchema.index(
  { userId: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
  },
);

module.exports = mongoose.model("Transaction", transactionSchema);
