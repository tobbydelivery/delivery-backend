const mongoose = require("mongoose");

const discountSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    description: { type: String },
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage"
    },
    discountValue: {
      type: Number,
      required: true,
      min: 1
    },
    minOrderAmount: {
      type: Number,
      default: 0
    },
    maxUses: {
      type: Number,
      default: 100
    },
    usedCount: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    expiresAt: {
      type: Date
    },
    usedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Discount", discountSchema);