const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    trackingNumber: { type: String, unique: true },
    sender: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String },
      address: { type: String, required: true },
      coordinates: {
        type: { type: String, default: "Point" },
        coordinates: [Number],
      },
    },
    recipient: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String },
      address: { type: String, required: true },
      coordinates: {
        type: { type: String, default: "Point" },
        coordinates: [Number],
      },
    },
    package: {
      description: { type: String, required: true },
      weight: { type: Number },
      dimensions: { type: String },
      fragile: { type: Boolean, default: false },
    },
    status: {
      type: String,
      enum: ["pending", "picked_up", "in_transit", "delivered", "cancelled", "delayed"],
      default: "pending",
    },
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    estimatedDelivery: { type: Date },
    deliveredAt: { type: Date },
    price: { type: Number, default: 2500 },
    paymentStatus: { type: String, enum: ["unpaid", "pending", "paid"], default: "unpaid" },
    paymentReference: { type: String },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

// Auto-generate tracking number
orderSchema.pre("save", function () {
  if (!this.trackingNumber) {
    this.trackingNumber = "TRK" + Date.now() + Math.floor(Math.random() * 1000);
  }
});

module.exports = mongoose.model("Order", orderSchema);