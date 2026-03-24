const Order = require("../models/Order");
const { initializePayment, verifyPayment } = require("../services/payment.service");
const { sendEmail } = require("../services/notification.service");

const makePayment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate("createdBy", "name email");
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (order.paymentStatus === "paid") {
      return res.status(400).json({ error: "Order already paid" });
    }

    const amount = order.price || 2500;

    const payment = await initializePayment({
      email: order.createdBy.email,
      amount,
      orderId: order._id.toString(),
      callbackUrl: `${process.env.BASE_URL || "http://localhost:3000"}/api/payments/verify`
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

const verifyOrderPayment = async (req, res) => {
  try {
    const { reference } = req.query;
    if (!reference) return res.status(400).json({ error: "Reference is required" });

    const verification = await verifyPayment(reference);

    if (!verification.status || verification.data.status !== "success") {
      return res.status(400).json({ error: "Payment verification failed" });
    }

    const orderId = verification.data.metadata?.orderId;
    const order = await Order.findById(orderId).populate("createdBy", "name email");

    if (!order) return res.status(404).json({ error: "Order not found" });

    order.paymentStatus = "paid";
    order.paidAt = new Date();
    await order.save();

    if (order.createdBy?.email) {
      await sendEmail({
        to: order.createdBy.email,
        subject: `Payment Confirmed - Order #${order.trackingNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #27ae60;">✅ Payment Confirmed!</h2>
            <p>Dear ${order.createdBy.name},</p>
            <p>Your payment for order <strong>#${order.trackingNumber}</strong> has been confirmed.</p>
            <p><strong>Amount Paid:</strong> ₦${verification.data.amount / 100}</p>
            <p><strong>Reference:</strong> ${reference}</p>
            <p>Your delivery is now being processed. Thank you!</p>
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

const getPaymentStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).select("trackingNumber paymentStatus paymentReference paidAt price");
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { makePayment, verifyOrderPayment, getPaymentStatus };