const mongoose = require("mongoose");

const createIndexes = async () => {
  try {
    const Order = require("../models/Order");
    const User = require("../models/User");
    const Review = require("../models/Review");
    const Discount = require("../models/Discount");

    // Order indexes
    await Order.collection.createIndex({ trackingNumber: 1 }, { unique: true, background: true });
    await Order.collection.createIndex({ createdBy: 1, createdAt: -1 }, { background: true });
    await Order.collection.createIndex({ assignedAgent: 1, status: 1 }, { background: true });
    await Order.collection.createIndex({ status: 1, createdAt: -1 }, { background: true });
    await Order.collection.createIndex({ paymentStatus: 1 }, { background: true });
    await Order.collection.createIndex({ createdAt: -1 }, { background: true });

    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true, background: true });
    await User.collection.createIndex({ role: 1, isActive: 1 }, { background: true });
   // Drop and recreate referralCode index
   try {
     await User.collection.dropIndex("referralCode_1");
     console.log("Dropped old referralCode index");
   } catch (e) {
      // Index might not exist, ignore
   }
   await User.collection.createIndex({ referralCode: 1 }, { unique: true, sparse: true, background: true });
    console.error("❌ Index creation error:", err.message);
  }
};

module.exports = createIndexes;