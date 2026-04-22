const Discount = require("../models/Discount");

// Create discount code (admin only)
const createDiscount = async (req, res) => {
  try {
    const { code, description, discountType, discountValue, minOrderAmount, maxUses, expiresAt } = req.body;
    const existing = await Discount.findOne({ code: code.toUpperCase() });
    if (existing) return res.status(400).json({ error: "Discount code already exists" });

    const discount = await Discount.create({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxUses,
      expiresAt
    });

    res.status(201).json({ message: "Discount code created", discount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all discount codes (admin only)
const getDiscounts = async (req, res) => {
  try {
    const discounts = await Discount.find().sort({ createdAt: -1 });
    res.json({ count: discounts.length, discounts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Validate discount code
const validateDiscount = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;
    if (!code) return res.status(400).json({ error: "Code is required" });

    const discount = await Discount.findOne({ code: code.toUpperCase() });
    if (!discount) return res.status(404).json({ error: "Invalid discount code" });
    if (!discount.isActive) return res.status(400).json({ error: "Discount code is inactive" });
    if (discount.expiresAt && new Date() > discount.expiresAt) return res.status(400).json({ error: "Discount code has expired" });
    if (discount.usedCount >= discount.maxUses) return res.status(400).json({ error: "Discount code has reached maximum uses" });
    if (orderAmount < discount.minOrderAmount) return res.status(400).json({ error: `Minimum order amount is ₦${discount.minOrderAmount}` });

    // Check if user already used this code
    if (discount.usedBy.includes(req.user._id)) {
      return res.status(400).json({ error: "You have already used this discount code" });
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discount.discountType === "percentage") {
      discountAmount = (orderAmount * discount.discountValue) / 100;
    } else {
      discountAmount = discount.discountValue;
    }

    const finalAmount = Math.max(orderAmount - discountAmount, 0);

    res.json({
      valid: true,
      code: discount.code,
      description: discount.description,
      discountType: discount.discountType,
      discountValue: discount.discountValue,
      discountAmount,
      originalAmount: orderAmount,
      finalAmount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Apply discount code to order
const applyDiscount = async (req, res) => {
  try {
    const { code, orderId } = req.body;
    const Order = require("../models/Order");

    const discount = await Discount.findOne({ code: code.toUpperCase() });
    if (!discount || !discount.isActive) return res.status(400).json({ error: "Invalid discount code" });
    if (discount.usedBy.includes(req.user._id)) return res.status(400).json({ error: "Already used this code" });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    let discountAmount = 0;
    if (discount.discountType === "percentage") {
      discountAmount = (order.price * discount.discountValue) / 100;
    } else {
      discountAmount = discount.discountValue;
    }

    order.price = Math.max(order.price - discountAmount, 0);
    order.discountCode = code.toUpperCase();
    order.discountAmount = discountAmount;
    await order.save();

    discount.usedCount += 1;
    discount.usedBy.push(req.user._id);
    await discount.save();

    res.json({ message: "Discount applied successfully", newPrice: order.price, discountAmount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete discount code (admin only)
const deleteDiscount = async (req, res) => {
  try {
    await Discount.findByIdAndDelete(req.params.id);
    res.json({ message: "Discount code deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createDiscount, getDiscounts, validateDiscount, applyDiscount, deleteDiscount };