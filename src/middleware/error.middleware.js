const mongoose = require("mongoose");

const errorHandler = (err, req, res, next) => {
  console.error("🚨 Error:", {
    message: err.message,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ error: "Validation Error", details: errors });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ error: `${field} already exists` });
  }

  // Mongoose cast error (invalid ID)
  if (err.name === "CastError") {
    return res.status(400).json({ error: "Invalid ID format" });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Invalid token. Please login again." });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Token expired. Please login again." });
  }

  // Multer file upload errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "File too large. Maximum size is 5MB." });
  }

  // Paystack errors
  if (err.message?.toLowerCase().includes("paystack")) {
    return res.status(400).json({ error: "Payment processing error. Please try again." });
  }

  // Default server error
  res.status(err.statusCode || 500).json({
    error: process.env.NODE_ENV === "production"
      ? "Something went wrong. Please try again later."
      : err.message
  });
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 Unhandled Rejection at:", promise, "reason:", reason);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("🚨 Uncaught Exception:", err.message);
  console.error(err.stack);
  process.exit(1);
});

module.exports = errorHandler;