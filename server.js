require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const connectDB = require("./src/config/db");

// Routes
const authRoutes = require("./src/routes/auth.routes");
const orderRoutes = require("./src/routes/order.routes");
const trackingRoutes = require("./src/routes/tracking.routes");
const geocodeRoutes = require("./src/routes/geocode.routes");
const agentRoutes = require("./src/routes/agent.routes");
const paymentRoutes = require("./src/routes/payment.routes");
const pricingRoutes = require("./src/routes/pricing.routes");
const invoiceRoutes = require("./src/routes/invoice.routes");

const app = express();
const httpServer = http.createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Make io accessible in controllers
app.set("io", io);

// ========== MIDDLEWARE ==========
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please try again later." }
});
app.use(limiter);

// ========== ROUTES ==========
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/geocode", geocodeRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/pricing", pricingRoutes);
app.use("/api/invoices", invoiceRoutes);

// Health check route
app.get("/", (req, res) => {
  res.json({
    message: "✅ Delivery Backend Server is Running!",
    version: "1.0.0",
    timestamp: new Date()
  });
});

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// ========== SOCKET.IO ==========
require("./src/config/socket")(io);

// ========== START SERVER ==========
connectDB().then(() => {
  httpServer.listen(process.env.PORT || 3000, () => {
    console.log(`🚀 Server running on port ${process.env.PORT || 3000}`);
  });
});