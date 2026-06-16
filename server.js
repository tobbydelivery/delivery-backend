require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const compression = require("compression");
const mongoose = require("mongoose");
const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");
const connectDB = require("./src/config/db");
const errorHandler = require("./src/middleware/error.middleware");
const logger = require("./src/middleware/logger.middleware");
const keepAlive = require("./src/utils/keepAlive");
const createIndexes = require("./src/utils/createIndexes");
const startOrderTimeoutJob = require("./src/utils/orderTimeout");

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

// ========== INIT APP FIRST ==========
const app = express();
const httpServer = http.createServer(app);

// ========== SENTRY (must be after app is created) ==========
Sentry.init({
  dsn: "https://ab83d00f5555aaafc0c1d5831318c2f8@o4511527597768704.ingest.de.sentry.io/4511527606354000",
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV || "development"
});

// ========== ALLOWED ORIGINS ==========
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "https://gilded-cajeta-16c5fb.netlify.app",
  "https://beamish-pony-0b8d1d.netlify.app",
  "https://peppy-kitten-d0c4e5.netlify.app",
  "https://precious-licorice-eeb30e.netlify.app",
  "https://stexlogistics.com",
  "https://www.stexlogistics.com",
  "https://admin.stexlogistics.com",
  "https://agent.stexlogistics.com"
];

// ========== SOCKET.IO ==========
const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"] },
  pingTimeout: 60000,
  pingInterval: 25000
});
app.set("io", io);

// ========== SECURITY MIDDLEWARE ==========
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

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(logger);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(mongoSanitize());

// ========== RATE LIMITERS ==========
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts. Please try again in 15 minutes." }
});

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

app.get("/health", async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = ["disconnected", "connected", "connecting", "disconnecting"];
  res.json({
    status: dbState === 1 ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    database: dbStatus[dbState],
    memory: {
      used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
    },
    version: "2.0.0",
    environment: process.env.NODE_ENV
  });
});

// ========== 404 HANDLER ==========
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method
  });
});

// ========== SENTRY ERROR HANDLER ==========
Sentry.setupExpressErrorHandler(app);

// ========== ERROR HANDLER ==========
app.use(errorHandler);

// ========== SOCKET.IO ==========
require("./src/config/socket")(io);

// ========== START SERVER ==========
connectDB().then(async () => {
  await createIndexes();

  httpServer.listen(process.env.PORT || 10000, () => {
    console.log(`🚀 STeX Logistics Server running on port ${process.env.PORT || 10000}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);

    if (process.env.NODE_ENV === "production") {
      keepAlive();
      startOrderTimeoutJob();
    }
  });
}).catch(err => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});