const Order = require("../models/Order");
const User = require("../models/User");
const axios = require("axios");
const {
  notifyOrderCreated,
  notifyOrderPickedUp,
  notifyOrderDelivered,
  notifyOrderDelayed,
  notifyAgentAssigned
} = require("../services/notification.service");

// Geocode an address
const geocodeAddress = async (address) => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    const res = await axios.get(url, { headers: { "User-Agent": "DeliveryBackend/1.0" } });
    if (res.data.length > 0) {
      return [parseFloat(res.data[0].lon), parseFloat(res.data[0].lat)];
    }
  } catch (err) {}
  return null;
};

// Create order
const createOrder = async (req, res) => {
  try {
    const { sender, recipient, package: pkg } = req.body;

    const senderCoords = await geocodeAddress(sender.address);
    const recipientCoords = await geocodeAddress(recipient.address);

    if (senderCoords) sender.coordinates = { type: "Point", coordinates: senderCoords };
    if (recipientCoords) recipient.coordinates = { type: "Point", coordinates: recipientCoords };

    const order = await Order.create({
      sender,
      recipient,
      package: pkg,
      createdBy: req.user._id,
      statusHistory: [{ status: "pending", note: "Order created", updatedBy: req.user._id }],
    });

    const io = req.app.get("io");
    if (io) io.emit("new_order", order);

    const user = await User.findById(req.user._id);
    if (user) {
      const orderData = {
        trackingNumber: order.trackingNumber || order._id,
        pickupAddress: sender.address,
        deliveryAddress: recipient.address
      };
      await notifyOrderCreated(orderData, user).catch(err => console.error("Notification error:", err.message));
    }

    res.status(201).json({ message: "Order created successfully", order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all orders
const getOrders = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === "user") query.createdBy = req.user._id;
    if (req.user.role === "agent") query.assignedAgent = req.user._id;

    const orders = await Order.find(query)
      .populate("createdBy", "name email")
      .populate("assignedAgent", "name email phone")
      .sort({ createdAt: -1 });

    res.json({ count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get single order
const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("assignedAgent", "name email phone");

    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update order status
const updateStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const order = await Order.findById(req.params.id).populate("createdBy", "name email phone");
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.status = status;
    order.statusHistory.push({ status, note, updatedBy: req.user._id });
    if (status === "delivered") order.deliveredAt = new Date();
    await order.save();

    const io = req.app.get("io");
    if (io) io.to(order._id.toString()).emit("status_update", { orderId: order._id, status, note });

    const user = order.createdBy;
    const orderData = {
      trackingNumber: order.trackingNumber || order._id,
      pickupAddress: order.sender?.address,
      deliveryAddress: order.recipient?.address
    };

    if (user) {
      if (status === "picked_up") {
        await notifyOrderPickedUp(orderData, user).catch(err => console.error("Notification error:", err.message));
      } else if (status === "delivered") {
        await notifyOrderDelivered(orderData, user).catch(err => console.error("Notification error:", err.message));
      } else if (status === "delayed") {
        await notifyOrderDelayed(orderData, user, note).catch(err => console.error("Notification error:", err.message));
      }
    }

    res.json({ message: "Status updated", order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Assign agent to order
const assignAgent = async (req, res) => {
  try {
    const { agentId } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { assignedAgent: agentId },
      { new: true }
    ).populate("assignedAgent", "name email phone");

    if (!order) return res.status(404).json({ error: "Order not found" });

    if (order.assignedAgent) {
      const orderData = {
        trackingNumber: order.trackingNumber || order._id,
        pickupAddress: order.sender?.address,
        deliveryAddress: order.recipient?.address
      };
      await notifyAgentAssigned(orderData, order.assignedAgent).catch(err => console.error("Notification error:", err.message));
    }

    res.json({ message: "Agent assigned", order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createOrder, getOrders, getOrder, updateStatus, assignAgent };