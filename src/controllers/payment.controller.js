const crypto = require("crypto");
const Order = require("../models/Order");
const { initializePayment, verifyPayment } = require("../services/payment.service");
const { sendEmail } = require("../services/notification.service");

// Initialize payment
const makePayment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate("createdBy", "name email");
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Only order owner can pay
    if (order.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized to pay for this order" });
    }

    if (order.paymentStatus === "paid") {
      return res.status(400).json({ error: "Order already paid" });
    }

    const amount = order.price || 2500;

    const payment = await initializePayment({
      email: order.createdBy.email,
      amount,
      orderId: order._id.toString(),
      callbackUrl: `${process.env.BASE_URL || "https://tobby-delivery-backend.onrender.com"}/api/payments/verify`
    });

    if (!payment.status) {
      return res.status(400).json({ error: "Payment initialization failed" });
    }

    order.paymentReference = payment.data.reference;
    order.paymentStatus = "pending";
    await order.save();

    res.json({
      message: "Payment initialized",
      paymentUrl: payment.data.authorization_url,
      reference: payment.data.reference
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Verify payment
const verifyOrderPayment = async (req, res) => {
  try {
    const { reference } = req.query;
    if (!reference) return res.status(400).json({ error: "Reference is required" });

    // Verify reference format to prevent injection
    if (!/^TBD_[a-f0-9]{24}_\d+$/.test(reference)) {
      return res.status(400).json({ error: "Invalid payment reference format" });
    }

    const verification = await verifyPayment(reference);

    if (!verification.status || verification.data.status !== "success") {
      return res.status(400).json({ error: "Payment verification failed" });
    }

    const orderId = verification.data.metadata?.orderId;
    const order = await Order.findById(orderId).populate("createdBy", "name email");

    if (!order) return res.status(404).json({ error: "Order not found" });

    // Prevent double payment
    if (order.paymentStatus === "paid") {
      return res.json({ message: "Payment already confirmed", order });
    }

    // Verify amount matches
    const expectedAmount = (order.price || 2500) * 100;
    if (verification.data.amount !== expectedAmount) {
      return res.status(400).json({ error: "Payment amount mismatch" });
    }

    order.paymentStatus = "paid";
    order.paidAt = new Date();
    await order.save();

    // Send payment confirmation email
    if (order.createdBy?.email) {
      await sendEmail({
        to: order.createdBy.email,
        subject: `✅ Payment Confirmed - Order #${order.trackingNumber}`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
            <div style="background: linear-gradient(135deg, #2c3e50, #27ae60); padding: 40px; border-radius: 16px 16px 0 0; text-align: center;">
              <div style="font-size: 50px; margin-bottom: 15px;">✅</div>
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 900;">Payment Confirmed!</h1>
            </div>
            <div style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
              <p style="color: #555; font-size: 15px;">Dear <strong>${order.createdBy.name}</strong>,</p>
              <p style="color: #555; line-height: 1.8;">Your payment has been confirmed and your delivery is now being processed.</p>
              <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 25px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 10px 0; color: #7f8c8d; font-size: 14px;">Tracking Number</td><td style="padding: 10px 0; font-weight: 700; color: #2c3e50;">${order.trackingNumber}</td></tr>
                  <tr><td style="padding: 10px 0; color: #7f8c8d; font-size: 14px;">Amount Paid</td><td style="padding: 10px 0; font-weight: 700; color: #27ae60;">₦${verification.data.amount / 100}</td></tr>
                  <tr><td style="padding: 10px 0; color: #7f8c8d; font-size: 14px;">Reference</td><td style="padding: 10px 0; font-weight: 700; color: #2c3e50;">${reference}</td></tr>
                  <tr><td style="padding: 10px 0; color: #7f8c8d; font-size: 14px;">Date</td><td style="padding: 10px 0; font-weight: 700; color: #2c3e50;">${new Date().toLocaleDateString()}</td></tr>
                </table>
              </div>
              <div style="text-align: center;">
                <a href="https://gilded-cajeta-16c5fb.netlify.app/dashboard" style="background: #27ae60; color: white; padding: 15px 40px; border-radius: 30px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">
                  Track Your Order →
                </a>
              </div>
            </div>
          </div>
        `
      }).catch(err => console.error("Email error:", err.message));
    }

    res.json({
      message: "Payment successful",
      order,
      amount: verification.data.amount / 100
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Paystack webhook - for real-time payment notifications
const paystackWebhook = async (req, res) => {
  try {
    // Verify webhook signature
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(401).json({ error: "Invalid webhook signature" });
    }

    const event = req.body;

    if (event.event === "charge.success") {
      const reference = event.data.reference;
      const orderId = event.data.metadata?.orderId;

      if (orderId) {
        const order = await Order.findById(orderId).populate("createdBy", "name email");
        if (order && order.paymentStatus !== "paid") {
          order.paymentStatus = "paid";
          order.paidAt = new Date();
          await order.save();
          console.log(`✅ Payment confirmed via webhook for order: ${order.trackingNumber}`);
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get payment status
const getPaymentStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .select("trackingNumber paymentStatus paymentReference paidAt price");
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { makePayment, verifyOrderPayment, paystackWebhook, getPaymentStatus };