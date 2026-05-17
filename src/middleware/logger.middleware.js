const logger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const log = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      timestamp: new Date().toISOString()
    };

    if (res.statusCode >= 400) {
      console.error("❌ Request Error:", log);
    } else if (duration > 3000) {
      console.warn("⚠️ Slow Request:", log);
    } else {
      console.log("✅ Request:", `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    }
  });

  next();
};

module.exports = logger;