const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    agent: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 500 },
    deliverySpeed: { type: Number, min: 1, max: 5 },
    packageCondition: { type: Number, min: 1, max: 5 },
    agentProfessionalism: { type: Number, min: 1, max: 5 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);