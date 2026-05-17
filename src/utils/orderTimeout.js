const { sendEmail } = require("../services/notification.service");

const handleOrderTimeouts = async () => {
  try {
    const Order = require("../models/Order");
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Auto-cancel unpaid pending orders after 24 hours
    const expiredOrders = await Order.find({
      status: "pending",
      paymentStatus: "unpaid",
      createdAt: { $lt: twentyFourHoursAgo }
    }).populate("createdBy", "name email");

    for (const order of expiredOrders) {
      order.status = "cancelled";
      order.statusHistory.push({
        status: "cancelled",
        note: "Auto-cancelled: No payment received within 24 hours",
        updatedAt: new Date()
      });
      await order.save();

      if (order.createdBy?.email) {
        sendEmail({
          to: order.createdBy.email,
          subject: `❌ Order ${order.trackingNumber} Cancelled`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #2c3e50, #e74c3c); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0;">STeX Logistics</h1>
              </div>
              <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px;">
                <h2 style="color: #e74c3c;">Order Automatically Cancelled</h2>
                <p>Hi ${order.createdBy.name},</p>
                <p>Your order <strong>${order.trackingNumber}</strong> has been automatically cancelled because no payment was received within 24 hours.</p>
                <p>If you still need delivery services, please create a new order.</p>
                <div style="text-align: center; margin: 25px 0;">
                  <a href="https://gilded-cajeta-16c5fb.netlify.app/dashboard" style="background: #e74c3c; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold;">
                    Book New Delivery
                  </a>
                </div>
              </div>
            </div>
          `
        }).catch(console.error);
      }

      console.log(`⏰ Auto-cancelled order: ${order.trackingNumber}`);
    }

    if (expiredOrders.length > 0) {
      console.log(`✅ Auto-cancelled ${expiredOrders.length} expired orders`);
    }
  } catch (err) {
    console.error("❌ Order timeout error:", err.message);
  }
};

const startOrderTimeoutJob = () => {
  // Run immediately on start
  handleOrderTimeouts();

  // Then run every hour
  setInterval(handleOrderTimeouts, 60 * 60 * 1000);
  console.log("⏰ Order timeout job started - runs every hour");
};

module.exports = startOrderTimeoutJob;