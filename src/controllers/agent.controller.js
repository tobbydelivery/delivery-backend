const User = require("../models/User");
const Order = require("../models/Order");

// Get all agents (admin only)
const getAgents = async (req, res) => {
  try {
    const agents = await User.find({ role: "agent" }).select("-password");
    res.json({ count: agents.length, agents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get agent's assigned orders
const getAgentOrders = async (req, res) => {
  try {
    const orders = await Order.find({ assignedAgent: req.params.id })
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });
    res.json({ count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAgents, getAgentOrders };
