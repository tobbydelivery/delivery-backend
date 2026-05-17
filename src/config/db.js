const mongoose = require("mongoose");

let isConnected = false;
let retryCount = 0;
const MAX_RETRIES = 5;

const connectDB = async () => {
  if (isConnected) return;

  try {
    mongoose.set("strictQuery", true);

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
      retryWrites: true,
      retryReads: true,
      heartbeatFrequencyMS: 10000
    });

    isConnected = true;
    retryCount = 0;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Handle disconnection
    mongoose.connection.on("disconnected", () => {
      console.log("❌ MongoDB disconnected!");
      isConnected = false;
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        console.log(`🔄 Attempting reconnect ${retryCount}/${MAX_RETRIES}...`);
        setTimeout(connectDB, 5000 * retryCount);
      } else {
        console.error("❌ Max reconnection attempts reached!");
      }
    });

    mongoose.connection.on("error", (err) => {
      console.error("MongoDB error:", err.message);
      isConnected = false;
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected!");
      isConnected = true;
      retryCount = 0;
    });

  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    isConnected = false;
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      console.log(`🔄 Retrying in ${5 * retryCount} seconds... (${retryCount}/${MAX_RETRIES})`);
      setTimeout(connectDB, 5000 * retryCount);
    } else {
      console.error("❌ Could not connect to MongoDB after maximum retries");
      process.exit(1);
    }
  }
};

module.exports = connectDB;