const Review = require("../models/Review");
const Order = require("../models/Order");

// Create review
const createReview = async (req, res) => {
  try {
    const { orderId, rating, comment, deliverySpeed, packageCondition, agentProfessionalism } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== "delivered") return res.status(400).json({ error: "Can only review delivered orders" });
    if (order.createdBy.toString() !== req.user._id.toString()) return res.status(403).json({ error: "Not authorized" });

    const existing = await Review.findOne({ order: orderId, user: req.user._id });
    if (existing) return res.status(400).json({ error: "You have already reviewed this order" });

    const review = await Review.create({
      order: orderId,
      user: req.user._id,
      agent: order.assignedAgent,
      rating,
      comment,
      deliverySpeed,
      packageCondition,
      agentProfessionalism
    });

    res.status(201).json({ message: "Review submitted successfully", review });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all reviews (admin)
const getReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("user", "name email")
      .populate("agent", "name email")
      .populate("order", "trackingNumber")
      .sort({ createdAt: -1 });

    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length || 0;

    res.json({ count: reviews.length, avgRating: avgRating.toFixed(1), reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get agent reviews
const getAgentReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ agent: req.params.agentId })
      .populate("user", "name")
      .populate("order", "trackingNumber")
      .sort({ createdAt: -1 });

    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length || 0;

    res.json({ count: reviews.length, avgRating: avgRating.toFixed(1), reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createReview, getReviews, getAgentReviews };