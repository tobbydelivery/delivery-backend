const Order = require("../models/Order");

// Public tracking by tracking number
const trackOrder = async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const order = await Order.findOne({ trackingNumber })
      .populate("assignedAgent", "name phone")
      .select("-createdBy");

    if (!order) return res.status(404).json({ error: "Order not found" });

    res.json({
      trackingNumber: order.trackingNumber,
      status: order.status,
      statusHistory: order.statusHistory,
      sender: { name: order.sender.name, address: order.sender.address },
      recipient: { name: order.recipient.name, address: order.recipient.address },
      package: order.package,
      assignedAgent: order.assignedAgent,
      estimatedDelivery: order.estimatedDelivery,
      deliveredAt: order.deliveredAt,
      createdAt: order.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { trackOrder };
