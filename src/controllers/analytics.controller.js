const Order = require("../models/Order");
const User = require("../models/User");
const Review = require("../models/Review");

const getAnalytics = async (req, res) => {
  try {
    const { period } = req.query;
    let dateFilter = {};

    if (period === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dateFilter = { createdAt: { $gte: today } };
    } else if (period === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = { createdAt: { $gte: weekAgo } };
    } else if (period === "month") {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFilter = { createdAt: { $gte: monthAgo } };
    } else if (period === "year") {
      const yearAgo = new Date();
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      dateFilter = { createdAt: { $gte: yearAgo } };
    }

    const orders = await Order.find(dateFilter);
    const users = await User.find({ role: "user" });
    const agents = await User.find({ role: "agent" });
    const reviews = await Review.find();

    // Revenue stats
    const totalRevenue = orders.filter(o => o.paymentStatus === "paid").reduce((sum, o) => sum + (o.price || 0), 0);
    const pendingRevenue = orders.filter(o => o.paymentStatus === "unpaid").reduce((sum, o) => sum + (o.price || 0), 0);

    // Order stats
    const ordersByStatus = {
      pending: orders.filter(o => o.status === "pending").length,
      picked_up: orders.filter(o => o.status === "picked_up").length,
      in_transit: orders.filter(o => o.status === "in_transit").length,
      delivered: orders.filter(o => o.status === "delivered").length,
      cancelled: orders.filter(o => o.status === "cancelled").length,
      delayed: orders.filter(o => o.status === "delayed").length
    };

    // Daily orders for chart (last 7 days)
    const dailyOrders = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayOrders = orders.filter(o => new Date(o.createdAt) >= date && new Date(o.createdAt) < nextDate);
      const dayRevenue = dayOrders.filter(o => o.paymentStatus === "paid").reduce((sum, o) => sum + (o.price || 0), 0);

      dailyOrders.push({
        date: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        orders: dayOrders.length,
        revenue: dayRevenue
      });
    }

    // Top locations
    const locationCount = {};
    orders.forEach(o => {
      if (o.recipient?.address) {
        const city = o.recipient.address.split(",")[1]?.trim() || o.recipient.address;
        locationCount[city] = (locationCount[city] || 0) + 1;
      }
    });

    const topLocations = Object.entries(locationCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([location, count]) => ({ location, count }));

    // Average rating
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length || 0;

    res.json({
      period: period || "all",
      summary: {
        totalOrders: orders.length,
        totalRevenue,
        pendingRevenue,
        totalUsers: users.length,
        totalAgents: agents.length,
        avgRating: avgRating.toFixed(1),
        successRate: orders.length > 0 ? ((ordersByStatus.delivered / orders.length) * 100).toFixed(1) : 0
      },
      ordersByStatus,
      dailyOrders,
      topLocations
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAnalytics };