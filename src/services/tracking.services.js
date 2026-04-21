const socketio = require("socket.io");

// Store active agent locations in memory
const agentLocations = new Map();
const orderRooms = new Map();

const initTracking = (io) => {
  io.on("connection", (socket) => {
    console.log(`📱 Client connected: ${socket.id}`);

    // Agent joins their room
    socket.on("agent_online", ({ agentId, orderId }) => {
      socket.join(`agent_${agentId}`);
      if (orderId) socket.join(`order_${orderId}`);
      console.log(`🚚 Agent ${agentId} is online`);
      io.emit("agent_status", { agentId, status: "online" });
    });

    // Customer tracks an order
    socket.on("track_order", ({ orderId }) => {
      socket.join(`order_${orderId}`);
      console.log(`👤 Customer tracking order: ${orderId}`);

      // Send current agent location if available
      const location = agentLocations.get(orderId);
      if (location) {
        socket.emit("agent_location", location);
      }
    });

    // Agent updates their location
    socket.on("update_location", ({ agentId, orderId, latitude, longitude, speed, heading }) => {
      const locationData = {
        agentId,
        orderId,
        latitude,
        longitude,
        speed: speed || 0,
        heading: heading || 0,
        timestamp: new Date()
      };

      // Store latest location
      agentLocations.set(orderId, locationData);

      // Broadcast to everyone tracking this order
      io.to(`order_${orderId}`).emit("agent_location", locationData);
      console.log(`📍 Agent ${agentId} location updated for order ${orderId}`);
    });

    // Order status update
    socket.on("order_status_update", ({ orderId, status, note }) => {
      io.to(`order_${orderId}`).emit("status_update", { orderId, status, note, timestamp: new Date() });
    });

    // Agent goes offline
    socket.on("agent_offline", ({ agentId }) => {
      console.log(`🔴 Agent ${agentId} went offline`);
      io.emit("agent_status", { agentId, status: "offline" });
    });

    socket.on("disconnect", () => {
      console.log(`📵 Client disconnected: ${socket.id}`);
    });
  });
};

module.exports = { initTracking, agentLocations };