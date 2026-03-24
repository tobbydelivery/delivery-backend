const nodemailer = require("nodemailer");
const twilio = require("twilio");

// ========== EMAIL SETUP ==========
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ========== TWILIO SETUP ==========
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ========== EMAIL NOTIFICATIONS ==========
const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: `"Tobby Delivery" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error("❌ Email error:", error.message);
  }
};

// ========== SMS NOTIFICATIONS ==========
const sendSMS = async ({ to, message }) => {
  try {
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to
    });
    console.log(`✅ SMS sent to ${to}`);
  } catch (error) {
    console.error("❌ SMS error:", error.message);
  }
};

// ========== NOTIFICATION TEMPLATES ==========

const notifyOrderCreated = async (order, user) => {
  const subject = `Order #${order.trackingNumber} Created Successfully`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2c3e50;">📦 Order Created!</h2>
      <p>Dear ${user.name},</p>
      <p>Your delivery order has been created successfully.</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Tracking Number</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${order.trackingNumber}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Pickup</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${order.pickupAddress}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Delivery</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${order.deliveryAddress}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Status</strong></td><td style="padding: 8px; border: 1px solid #ddd;">Pending</td></tr>
      </table>
      <p style="margin-top: 20px;">Track your order using tracking number: <strong>${order.trackingNumber}</strong></p>
      <p>Thank you for choosing Tobby Delivery!</p>
    </div>
  `;

  await sendEmail({ to: user.email, subject, html });

  if (user.phone) {
    await sendSMS({
      to: user.phone,
      message: `Tobby Delivery: Your order #${order.trackingNumber} has been created. Pickup: ${order.pickupAddress}. Track your order online.`
    });
  }
};

const notifyOrderPickedUp = async (order, user) => {
  const subject = `Order #${order.trackingNumber} Picked Up!`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #27ae60;">🚚 Order Picked Up!</h2>
      <p>Dear ${user.name},</p>
      <p>Your package has been picked up and is on its way!</p>
      <p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>
      <p><strong>Destination:</strong> ${order.deliveryAddress}</p>
      <p>You will be notified when your package is delivered.</p>
    </div>
  `;

  await sendEmail({ to: user.email, subject, html });

  if (user.phone) {
    await sendSMS({
      to: user.phone,
      message: `Tobby Delivery: Your package #${order.trackingNumber} has been picked up and is on the way to ${order.deliveryAddress}!`
    });
  }
};

const notifyOrderDelivered = async (order, user) => {
  const subject = `Order #${order.trackingNumber} Delivered!`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #27ae60;">✅ Order Delivered!</h2>
      <p>Dear ${user.name},</p>
      <p>Your package has been delivered successfully!</p>
      <p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>
      <p><strong>Delivered To:</strong> ${order.deliveryAddress}</p>
      <p>Thank you for choosing Tobby Delivery! We hope to serve you again.</p>
    </div>
  `;

  await sendEmail({ to: user.email, subject, html });

  if (user.phone) {
    await sendSMS({
      to: user.phone,
      message: `Tobby Delivery: Your package #${order.trackingNumber} has been delivered to ${order.deliveryAddress}! Thank you for using our service.`
    });
  }
};

const notifyOrderDelayed = async (order, user, reason) => {
  const subject = `Order #${order.trackingNumber} - Delivery Delayed`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #e74c3c;">⚠️ Delivery Delayed</h2>
      <p>Dear ${user.name},</p>
      <p>We regret to inform you that your delivery has been delayed.</p>
      <p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>
      <p><strong>Reason:</strong> ${reason || "Unforeseen circumstances"}</p>
      <p>We apologize for the inconvenience and will update you as soon as possible.</p>
    </div>
  `;

  await sendEmail({ to: user.email, subject, html });

  if (user.phone) {
    await sendSMS({
      to: user.phone,
      message: `Tobby Delivery: Sorry, your order #${order.trackingNumber} has been delayed. Reason: ${reason || "Unforeseen circumstances"}. We apologize for the inconvenience.`
    });
  }
};

const notifyAgentAssigned = async (order, agent) => {
  const subject = `New Delivery Assignment - Order #${order.trackingNumber}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2c3e50;">📋 New Assignment</h2>
      <p>Dear ${agent.name},</p>
      <p>You have been assigned a new delivery order.</p>
      <p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>
      <p><strong>Pickup:</strong> ${order.pickupAddress}</p>
      <p><strong>Delivery:</strong> ${order.deliveryAddress}</p>
      <p>Please pick up the package as soon as possible.</p>
    </div>
  `;

  await sendEmail({ to: agent.email, subject, html });

  if (agent.phone) {
    await sendSMS({
      to: agent.phone,
      message: `Tobby Delivery: New assignment! Order #${order.trackingNumber}. Pickup from: ${order.pickupAddress}. Deliver to: ${order.deliveryAddress}.`
    });
  }
};

module.exports = {
  notifyOrderCreated,
  notifyOrderPickedUp,
  notifyOrderDelivered,
  notifyOrderDelayed,
  notifyAgentAssigned,
  sendEmail,
  sendSMS
};