const nodemailer = require("nodemailer");
const twilio = require("twilio");

// ========== EMAIL SETUP - Port 587 (TLS) instead of 465 (SSL) ==========
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// ========== TWILIO SETUP ==========
let twilioClient;
try {
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
} catch (err) {
  console.error("❌ Twilio setup error:", err.message);
}

// ========== EMAIL SENDER ==========
const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: `"STeX Logistics" <${process.env.BREVO_EMAIL}>`,
      to,
      subject,
      html
    });
    console.log(`✅ Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error("❌ Email error:", error.message);
    return false;
  }
};

// ========== SMS SENDER ==========
const sendSMS = async ({ to, message }) => {
  try {
    if (!twilioClient) throw new Error("Twilio not configured");
    if (!to || !message) throw new Error("Phone and message required");

    // Format Nigerian phone numbers
    let formattedPhone = to.replace(/\s/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "+234" + formattedPhone.slice(1);
    } else if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+234" + formattedPhone;
    }

    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to: formattedPhone
    });
    console.log(`✅ SMS sent to ${formattedPhone}`);
    return true;
  } catch (error) {
    console.error("❌ SMS error:", error.message);
    return false;
  }
};

// ========== EMAIL TEMPLATE WRAPPER ==========
const emailTemplate = (content) => `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
    <div style="background: linear-gradient(135deg, #2c3e50, #e74c3c); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
      <div style="font-size: 40px; margin-bottom: 10px;">🚚</div>
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 900;">STeX Logistics</h1>
      <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0; font-size: 11px; letter-spacing: 2px;">SWIFT • TRUSTED • EXPRESS</p>
    </div>
    <div style="background: white; padding: 35px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
      ${content}
      <div style="border-top: 1px solid #ecf0f1; margin-top: 25px; padding-top: 20px;">
        <p style="color: #7f8c8d; font-size: 13px; margin: 0;">
          Need help? Contact us at <a href="mailto:support@stexlogistics.com" style="color: #e74c3c;">support@stexlogistics.com</a> or call +234 800 000 0000
        </p>
      </div>
    </div>
    <p style="text-align: center; color: #95a5a6; font-size: 12px; margin-top: 15px;">
      © 2024 STeX Logistics. All rights reserved.
    </p>
  </div>
`;

// ========== NOTIFICATION TEMPLATES ==========

const notifyOrderCreated = async (order, user) => {
  const content = `
    <h2 style="color: #2c3e50; margin-bottom: 5px;">📦 Order Created!</h2>
    <p style="color: #555;">Dear <strong>${user.name}</strong>,</p>
    <p style="color: #555;">Your delivery order has been created successfully.</p>
    <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #7f8c8d; font-size: 14px;">Tracking Number</td><td style="padding: 8px 0; font-weight: 700; color: #3498db;">${order.trackingNumber}</td></tr>
        <tr><td style="padding: 8px 0; color: #7f8c8d; font-size: 14px;">Pickup</td><td style="padding: 8px 0; color: #2c3e50;">${order.pickupAddress}</td></tr>
        <tr><td style="padding: 8px 0; color: #7f8c8d; font-size: 14px;">Delivery</td><td style="padding: 8px 0; color: #2c3e50;">${order.deliveryAddress}</td></tr>
        <tr><td style="padding: 8px 0; color: #7f8c8d; font-size: 14px;">Status</td><td style="padding: 8px 0;"><span style="background: #fef9e7; color: #f39c12; padding: 3px 10px; border-radius: 10px; font-size: 12px; font-weight: 700;">PENDING</span></td></tr>
      </table>
    </div>
    <div style="text-align: center; margin: 25px 0;">
      <a href="https://gilded-cajeta-16c5fb.netlify.app/track?id=${order.trackingNumber}" style="background: #e74c3c; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: 700; display: inline-block;">
        Track Your Order →
      </a>
    </div>
  `;

  await sendEmail({ to: user.email, subject: `📦 Order #${order.trackingNumber} Created - STeX Logistics`, html: emailTemplate(content) });

  if (user.phone) {
    await sendSMS({
      to: user.phone,
      message: `STeX Logistics: Your order #${order.trackingNumber} has been created. Pickup: ${order.pickupAddress}. Track at: stexlogistics.com`
    });
  }
};

const notifyOrderPickedUp = async (order, user) => {
  const content = `
    <h2 style="color: #3498db; margin-bottom: 5px;">🚚 Package Picked Up!</h2>
    <p style="color: #555;">Dear <strong>${user.name}</strong>,</p>
    <p style="color: #555;">Great news! Your package has been picked up and is on its way.</p>
    <div style="background: #ebf5fb; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0; color: #2c3e50;"><strong>Tracking:</strong> ${order.trackingNumber}</p>
      <p style="margin: 8px 0 0; color: #555;"><strong>Destination:</strong> ${order.deliveryAddress}</p>
    </div>
    <div style="text-align: center; margin: 25px 0;">
      <a href="https://gilded-cajeta-16c5fb.netlify.app/track?id=${order.trackingNumber}" style="background: #3498db; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: 700; display: inline-block;">
        Track Live Location →
      </a>
    </div>
  `;

  await sendEmail({ to: user.email, subject: `🚚 Package Picked Up - Order #${order.trackingNumber}`, html: emailTemplate(content) });

  if (user.phone) {
    await sendSMS({
      to: user.phone,
      message: `STeX Logistics: Your package #${order.trackingNumber} has been picked up and is on the way to ${order.deliveryAddress}!`
    });
  }
};

const notifyOrderDelivered = async (order, user) => {
  const content = `
    <h2 style="color: #27ae60; margin-bottom: 5px;">✅ Package Delivered!</h2>
    <p style="color: #555;">Dear <strong>${user.name}</strong>,</p>
    <p style="color: #555;">Your package has been delivered successfully! 🎉</p>
    <div style="background: #eafaf1; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
      <div style="font-size: 40px; margin-bottom: 10px;">✅</div>
      <p style="margin: 0; font-weight: 700; color: #27ae60; font-size: 16px;">Delivery Complete!</p>
      <p style="margin: 5px 0 0; color: #555;">Tracking: ${order.trackingNumber}</p>
    </div>
    <p style="color: #555; text-align: center;">Thank you for choosing STeX Logistics! We hope to serve you again.</p>
    <div style="text-align: center; margin: 25px 0;">
      <a href="https://gilded-cajeta-16c5fb.netlify.app/dashboard" style="background: #27ae60; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: 700; display: inline-block;">
        Book Another Delivery →
      </a>
    </div>
  `;

  await sendEmail({ to: user.email, subject: `✅ Package Delivered - Order #${order.trackingNumber}`, html: emailTemplate(content) });

  if (user.phone) {
    await sendSMS({
      to: user.phone,
      message: `STeX Logistics: Your package #${order.trackingNumber} has been delivered to ${order.deliveryAddress}! Thank you for using STeX Logistics.`
    });
  }
};

const notifyOrderDelayed = async (order, user, reason) => {
  const content = `
    <h2 style="color: #e67e22; margin-bottom: 5px;">⚠️ Delivery Delayed</h2>
    <p style="color: #555;">Dear <strong>${user.name}</strong>,</p>
    <p style="color: #555;">We sincerely apologize for the inconvenience. Your delivery has been delayed.</p>
    <div style="background: #fef9e7; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #e67e22;">
      <p style="margin: 0; color: #2c3e50;"><strong>Tracking:</strong> ${order.trackingNumber}</p>
      <p style="margin: 8px 0 0; color: #555;"><strong>Reason:</strong> ${reason || "Unforeseen circumstances"}</p>
    </div>
    <p style="color: #555;">We are working hard to deliver your package as soon as possible. You will receive another notification once delivery resumes.</p>
    <div style="text-align: center; margin: 25px 0;">
      <a href="https://gilded-cajeta-16c5fb.netlify.app/track?id=${order.trackingNumber}" style="background: #e67e22; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: 700; display: inline-block;">
        Track Order →
      </a>
    </div>
  `;

  await sendEmail({ to: user.email, subject: `⚠️ Delivery Delayed - Order #${order.trackingNumber}`, html: emailTemplate(content) });

  if (user.phone) {
    await sendSMS({
      to: user.phone,
      message: `STeX Logistics: Sorry, order #${order.trackingNumber} is delayed. Reason: ${reason || "Unforeseen circumstances"}. We apologize for the inconvenience.`
    });
  }
};

const notifyAgentAssigned = async (order, agent) => {
  const content = `
    <h2 style="color: #2c3e50; margin-bottom: 5px;">📋 New Delivery Assignment</h2>
    <p style="color: #555;">Dear <strong>${agent.name}</strong>,</p>
    <p style="color: #555;">You have been assigned a new delivery order. Please pick up the package as soon as possible.</p>
    <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #7f8c8d; font-size: 14px;">Tracking Number</td><td style="padding: 8px 0; font-weight: 700; color: #3498db;">${order.trackingNumber}</td></tr>
        <tr><td style="padding: 8px 0; color: #7f8c8d; font-size: 14px;">Pickup From</td><td style="padding: 8px 0; color: #2c3e50;">${order.pickupAddress}</td></tr>
        <tr><td style="padding: 8px 0; color: #7f8c8d; font-size: 14px;">Deliver To</td><td style="padding: 8px 0; color: #2c3e50;">${order.deliveryAddress}</td></tr>
      </table>
    </div>
    <div style="text-align: center; margin: 25px 0;">
      <a href="https://peppy-kitten-d0c4e5.netlify.app" style="background: #e74c3c; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: 700; display: inline-block;">
        Open Agent Portal →
      </a>
    </div>
  `;

  await sendEmail({ to: agent.email, subject: `📋 New Assignment - Order #${order.trackingNumber}`, html: emailTemplate(content) });

  if (agent.phone) {
    await sendSMS({
      to: agent.phone,
      message: `STeX Logistics: New assignment! Order #${order.trackingNumber}. Pickup from: ${order.pickupAddress}. Deliver to: ${order.deliveryAddress}. Login to agent portal.`
    });
  }
};

module.exports = {
  sendEmail,
  sendSMS,
  notifyOrderCreated,
  notifyOrderPickedUp,
  notifyOrderDelivered,
  notifyOrderDelayed,
  notifyAgentAssigned
};