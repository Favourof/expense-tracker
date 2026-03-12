const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["income", "expense"], required: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

categorySchema.index({ userId: 1, type: 1, name: 1, parentId: 1 }, { unique: true });

module.exports = mongoose.model("Category", categorySchema);
