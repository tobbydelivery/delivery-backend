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
const { sendOrderStatusPush, sendPushNotification } = require("../services/push.service");

// Geocode an address
const geocodeAddress = async (address) => {
  try {
    // Try Google Maps first
    if (process.env.GOOGLE_MAPS_API_KEY) {
      const { Client } = require("@googlemaps/google-maps-services-js");
      const client = new Client({});
      const response = await client.geocode({
        params: { address, key: process.env.GOOGLE_MAPS_API_KEY, region: "ng" }
      });
      if (response.data.results.length > 0) {
        const { lat, lng } = response.data.results[0].geometry.location;
        return [lng, lat];
      }
    }
  } catch (err) {
    console.error("Google geocode error:", err.message);
  }

  // Fallback to Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=ng`;
    const res = await axios.get(url, { headers: { "User-Agent": "STexLogistics/1.0" } });
    if (res.data.length > 0) {
      return [parseFloat(res.data[0].lon), parseFloat(res.data[0].lat)];
    }
  } catch (err) {
    console.error("Nominatim geocode error:", err.message);
  }

  return null;
};

// Create order
const createOrder = async (req, res) => {
  try {
    const { sender, recipient, package: pkg } = req.body;

    // Geocode addresses
    const senderCoords = await geocodeAddress(sender.address);
    const recipientCoords = await geocodeAddress(recipient.address);

    if (senderCoords) sender.coordinates = { type: "Point", coordinates: senderCoords };
    if (recipientCoords) recipient.coordinates = { type: "Point", coordinates: recipientCoords };

    const order = await Order.create({
      sender,
      recipient,
      package: pkg,
      createdBy: req.user._id,
      statusHistory: [{ status: "pending", note: "Order created", updatedBy: req.user._id }]
    });

    // Update user stats
    await User.findByIdAndUpdate(req.user._id, { $inc: { totalOrders: 1 } });

    // Emit socket event
    const io = req.app.get("io");
    if (io) io.emit("new_order", order);

    // Get user with device token
    const user = await User.findById(req.user._id);

    if (user) {
      const orderData = {
        trackingNumber: order.trackingNumber || order._id,
        pickupAddress: sender.address,
        deliveryAddress: recipient.address
      };

      // Send email notification
      notifyOrderCreated(orderData, user).catch(err => console.error("Email error:", err.message));

      // Send push notification
      if (user.deviceToken && user.pushNotifications) {
        sendPushNotification({
          token: user.deviceToken,
          title: "📦 Order Placed Successfully!",
          body: `Your order ${order.trackingNumber} has been received. We will pick it up shortly!`,
          data: { trackingNumber: order.trackingNumber, screen: "Track" }
        }).catch(err => console.error("Push error:", err.message));
      }
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

    if (req.query.status) query.status = req.query.status;
    if (req.query.paymentStatus) query.paymentStatus = req.query.paymentStatus;

    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) query.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.createdAt.$lte = new Date(req.query.endDate);
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.$or = [
        { trackingNumber: searchRegex },
        { "sender.name": searchRegex },
        { "recipient.name": searchRegex },
        { "sender.phone": searchRegex },
        { "recipient.phone": searchRegex }
      ];
    }

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate("createdBy", "name email phone")
        .populate("assignedAgent", "name email phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query)
    ]);

    res.json({
      count: orders.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      hasMore: page < Math.ceil(total / limit),
      orders
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get single order
const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("createdBy", "name email phone")
      .populate("assignedAgent", "name email phone");

    if (!order) return res.status(404).json({ error: "Order not found" });

    // Only allow owner, agent or admin
    if (
      req.user.role === "user" &&
      order.createdBy._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ error: "Not authorized" });
    }

    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update order status
const updateStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const order = await Order.findById(req.params.id)
      .populate("createdBy", "name email phone deviceToken pushNotifications");

    if (!order) return res.status(404).json({ error: "Order not found" });

    const previousStatus = order.status;
    order.status = status;
    order.statusHistory.push({ status, note, updatedBy: req.user._id });
    if (status === "delivered") {
      order.deliveredAt = new Date();
      // Update user stats
      await User.findByIdAndUpdate(order.createdBy._id, {
        $inc: { totalSpent: order.price || 0 }
      });
    }
    await order.save();

    // Emit socket event
    const io = req.app.get("io");
    if (io) io.to(order._id.toString()).emit("status_update", { orderId: order._id, status, note });

    const user = order.createdBy;
    const orderData = {
      trackingNumber: order.trackingNumber || order._id,
      pickupAddress: order.sender?.address,
      deliveryAddress: order.recipient?.address
    };

    if (user) {
      // Send email notifications
      if (status === "picked_up") {
        notifyOrderPickedUp(orderData, user).catch(err => console.error("Email error:", err.message));
      } else if (status === "delivered") {
        notifyOrderDelivered(orderData, user).catch(err => console.error("Email error:", err.message));
      } else if (status === "delayed") {
        notifyOrderDelayed(orderData, user, note).catch(err => console.error("Email error:", err.message));
      }

      // Send push notification
      if (user.deviceToken && user.pushNotifications) {
        sendOrderStatusPush({
          deviceToken: user.deviceToken,
          status,
          trackingNumber: order.trackingNumber
        }).catch(err => console.error("Push error:", err.message));
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

    const agent = await User.findById(agentId);
    if (!agent || agent.role !== "agent") {
      return res.status(400).json({ error: "Invalid agent" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { assignedAgent: agentId },
      { new: true }
    ).populate("assignedAgent", "name email phone deviceToken");

    if (!order) return res.status(404).json({ error: "Order not found" });

    // Notify agent via email
    if (order.assignedAgent) {
      const orderData = {
        trackingNumber: order.trackingNumber || order._id,
        pickupAddress: order.sender?.address,
        deliveryAddress: order.recipient?.address
      };
      notifyAgentAssigned(orderData, order.assignedAgent).catch(err => console.error("Email error:", err.message));

      // Send push to agent
      if (order.assignedAgent.deviceToken) {
        sendPushNotification({
          token: order.assignedAgent.deviceToken,
          title: "🚚 New Delivery Assigned!",
          body: `Order ${order.trackingNumber} has been assigned to you. Please pick it up!`,
          data: { trackingNumber: order.trackingNumber, screen: "Orders" }
        }).catch(err => console.error("Push error:", err.message));
      }
    }

    res.json({ message: "Agent assigned", order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Cancel order
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Only pending orders can be cancelled
    if (!["pending"].includes(order.status)) {
      return res.status(400).json({ error: "Only pending orders can be cancelled" });
    }

    // Only order owner or admin can cancel
    if (
      req.user.role !== "admin" &&
      order.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ error: "Not authorized to cancel this order" });
    }

    order.status = "cancelled";
    order.statusHistory.push({
      status: "cancelled",
      note: req.body.reason || "Cancelled by user",
      updatedBy: req.user._id
    });
    await order.save();

    // Emit socket event
    const io = req.app.get("io");
    if (io) io.to(order._id.toString()).emit("status_update", { orderId: order._id, status: "cancelled" });

    res.json({ message: "Order cancelled successfully", order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const uploadProof = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (!req.file) return res.status(400).json({ error: "No photo uploaded" });

    order.proofOfDelivery = {
      data: req.file.buffer.toString("base64"),
      contentType: req.file.mimetype,
      uploadedAt: new Date(),
      uploadedBy: req.user._id
    };
    order.statusHistory.push({
      status: order.status,
      note: "Proof of delivery photo uploaded",
      updatedBy: req.user._id
    });
    await order.save();

    res.json({ message: "Proof of delivery uploaded successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createOrder, getOrders, getOrder, updateStatus, assignAgent, cancelOrder, uploadProof };
