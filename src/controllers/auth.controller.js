const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendEmail } = require("../services/notification.service");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// Register
const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already registered" });

    const user = await User.create({ name, email, password, phone });
    const token = generateToken(user._id);

    // Send welcome email
    await sendEmail({
      to: email,
      subject: "Welcome to STeX Logistics! 🚚",
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2c3e50, #e74c3c); padding: 40px; border-radius: 16px 16px 0 0; text-align: center;">
            <div style="font-size: 50px; margin-bottom: 15px;">🚚</div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 900;">STeX Logistics</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; letter-spacing: 2px; font-size: 12px;">SWIFT • TRUSTED • EXPRESS</p>
          </div>
          <div style="background: white; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            <h2 style="color: #2c3e50; font-size: 24px;">Welcome aboard, ${name}! 🎉</h2>
            <p style="color: #555; line-height: 1.8; font-size: 15px;">
              Thank you for joining STeX Logistics — Nigeria's most reliable delivery service. 
              Your account has been created successfully and you're ready to start shipping!
            </p>
            <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 25px 0;">
              <h3 style="color: #2c3e50; margin: 0 0 15px; font-size: 16px;">What you can do:</h3>
              <div style="display: flex; flex-direction: column; gap: 10px;">
                ${["📦 Book a delivery in minutes", "📍 Track your packages in real-time", "💰 Pay securely with Paystack", "🔔 Get instant SMS & email updates", "📄 Download PDF invoices"].map(item => `
                  <div style="padding: 10px 15px; background: white; border-radius: 8px; border-left: 4px solid #e74c3c; color: #555; font-size: 14px;">${item}</div>
                `).join("")}
              </div>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://gilded-cajeta-16c5fb.netlify.app/dashboard" style="background: #e74c3c; color: white; padding: 15px 40px; border-radius: 30px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">
                Start Shipping Now →
              </a>
            </div>
            <div style="border-top: 1px solid #ecf0f1; padding-top: 25px; margin-top: 25px;">
              <p style="color: #7f8c8d; font-size: 13px; line-height: 1.8; margin: 0;">
                Need help? Contact us at <a href="mailto:info@stexlogistics.com" style="color: #e74c3c;">info@stexlogistics.com</a><br>
                📞 +234 800 000 0000 | Available 24/7
              </p>
            </div>
          </div>
          <p style="text-align: center; color: #95a5a6; font-size: 12px; margin-top: 20px;">
            © 2024 STeX Logistics. All rights reserved.
          </p>
        </div>
      `
    }).catch(err => console.error("Welcome email error:", err.message));

    res.status(201).json({
      message: "Registration successful",
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = generateToken(user._id);
    res.json({
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get current user
const getMe = async (req, res) => {
  res.json({ user: req.user });
};

module.exports = { register, login, getMe };