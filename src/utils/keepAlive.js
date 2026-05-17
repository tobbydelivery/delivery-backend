const https = require("https");

const keepAlive = () => {
  const url = process.env.BACKEND_URL || "https://tobby-delivery-backend.onrender.com";

  setInterval(() => {
    https.get(`${url}/health`, (res) => {
      console.log(`🔄 Keep-alive ping: ${res.statusCode} at ${new Date().toLocaleTimeString()}`);
    }).on("error", (err) => {
      console.error("❌ Keep-alive error:", err.message);
    });
  }, 14 * 60 * 1000); // Every 14 minutes

  console.log("💓 Keep-alive service started");
};

module.exports = keepAlive;