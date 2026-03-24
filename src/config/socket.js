module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Join a room for a specific order
    socket.on("join_order_room", ({ orderId }) => {
      socket.join(orderId);
      console.log(`📦 Socket ${socket.id} joined room: ${orderId}`);
    });

    // Agent sends location update
    socket.on("agent_location_update", (data) => {
      const { orderId, agentId, coordinates, speed, heading } = data;
      // Broadcast to everyone in the order room
      io.to(orderId).emit("location_update", {
        orderId,
        agentId,
        coordinates,
        speed,
        heading,
        timestamp: new Date(),
      });
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
};
