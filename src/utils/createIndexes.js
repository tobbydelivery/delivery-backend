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
    await User.collection.createIndex({ deviceToken: 1 }, { sparse: true, background: true });

    // Create referralCode index safely
    try {
      await User.collection.createIndex(
        { referralCode: 1 },
        { unique: true, sparse: true, background: true }
      );
    } catch (e) {
      // Index already exists, ignore
    }
    await User.collection.createIndex({ referralCode: 1 }, { unique: true, sparse: true, background: true });

    // Review indexes
    await Review.collection.createIndex({ order: 1 }, { background: true });
    await Review.collection.createIndex({ agent: 1 }, { background: true });
    await Review.collection.createIndex({ user: 1 }, { background: true });

    // Discount indexes
    await Discount.collection.createIndex({ code: 1 }, { unique: true, background: true });
    await Discount.collection.createIndex({ isActive: 1, expiresAt: 1 }, { background: true });

    console.log("✅ Database indexes created successfully");
  } catch (err) {
    console.error("❌ Index creation error:", err.message);
  }
};

module.exports = createIndexes;