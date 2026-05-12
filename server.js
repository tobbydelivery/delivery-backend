require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const compression = require("compression");
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
const discountRoutes = require("./src/routes/discount.routes");
const reviewRoutes = require("./src/routes/review.routes");
const analyticsRoutes = require("./src/routes/analytics.routes");

const app = express();
const httpServer = http.createServer(app);

// ========== ALLOWED ORIGINS ==========
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "https://gilded-cajeta-16c5fb.netlify.app",
  "https://beamish-pony-0b8d1d.netlify.app",
  "https://peppy-kitten-d0c4e5.netlify.app",
  "https://stexlogistics.com",
  "https://www.stexlogistics.com",
  "https://admin.stexlogistics.com",
  "https://agent.stexlogistics.com"
];

// ========== SOCKET.IO ==========
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});
app.set("io", io);

// ========== SECURITY MIDDLEWARE ==========

// CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Helmet
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Compression
app.use(compression());

// Logging
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Body parser with size limit
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// MongoDB injection protection
app.use(mongoSanitize());

// ========== RATE LIMITERS ==========

// General rate limit
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false
});

// Auth routes strict limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false
});

// Payment limit
const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: "Too many payment requests. Please try again later." }
});

app.use(generalLimiter);

// ========== ROUTES ==========
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/geocode", geocodeRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/payments", paymentLimiter, paymentRoutes);
app.use("/api/pricing", pricingRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/discounts", discountRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/analytics", analyticsRoutes);

// ========== HEALTH CHECK ==========
app.get("/", (req, res) => {
  res.json({
    message: "✅ STeX Logistics API is Running!",
    version: "2.0.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date()
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy", uptime: process.uptime() });
});

// ========== ERROR HANDLERS ==========
app.use((req, res) => {
  res.status(404).json({ error: "Route not found." });
});

app.use((err, req, res, next) => {
  console.error("Server error:", err.message);
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "CORS: Origin not allowed" });
  }
  res.status(500).json({
    error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message
  });
});

// ========== SOCKET.IO ==========
require("./src/config/socket")(io);

// ========== START SERVER ==========
connectDB().then(() => {
  httpServer.listen(process.env.PORT || 3000, () => {
    console.log(`🚀 STeX Logistics Server running on port ${process.env.PORT || 3000}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  });
}).catch(err => {
  console.error("Failed to connect to database:", err);
  process.exit(1);
});