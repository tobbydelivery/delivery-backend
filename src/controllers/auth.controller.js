const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { sendEmail } = require("../services/notification.service");
const { sendWelcomePush } = require("../services/push.service");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// Register
const register = async (req, res) => {
  try {
    const { name, email, password, phone, deviceToken, referralCode } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already registered" });

    const user = await User.create({ name, email, password, phone, deviceToken });

    // Generate referral code
    user.generateReferralCode();

    // Handle referral
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        user.referredBy = referrer._id;
        referrer.referralCount += 1;
        referrer.referralBonus += 500;
        await referrer.save();
      }
    }

    await user.save();

    const token = generateToken(user._id);

    // Send welcome email
    sendEmail({
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
              Your account has been created successfully!
            </p>
            <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0; color: #2c3e50; font-weight: 700;">Your Referral Code:</p>
              <p style="margin: 8px 0 0; font-size: 24px; font-weight: 900; color: #e74c3c; letter-spacing: 3px;">${user.referralCode}</p>
              <p style="margin: 8px 0 0; color: #7f8c8d; font-size: 13px;">Share this code and earn ₦500 for every friend who signs up!</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://gilded-cajeta-16c5fb.netlify.app/dashboard" style="background: #e74c3c; color: white; padding: 15px 40px; border-radius: 30px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">
                Start Shipping Now →
              </a>
            </div>
          </div>
        </div>
      `
    }).catch(err => console.error("Welcome email error:", err.message));

    // Send welcome push notification
    if (deviceToken) {
      sendWelcomePush({ deviceToken, name }).catch(err => console.error("Push error:", err.message));
    }

    res.status(201).json({
      message: "Registration successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        referralCode: user.referralCode
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password, deviceToken } = req.body;

    const user = await User.findOne({ email });

    // Check if account is locked
    if (user && user.isLocked()) {
      return res.status(423).json({ error: "Account temporarily locked. Try again in 15 minutes." });
    }

    if (!user || !(await user.comparePassword(password))) {
      // Increment login attempts
      if (user) {
        user.loginAttempts += 1;
        if (user.loginAttempts >= 5) {
          user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
          user.loginAttempts = 0;
        }
        await user.save();
      }
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Reset login attempts on success
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();

    // Update device token
    if (deviceToken) {
      user.deviceToken = deviceToken;
      user.deviceTokenUpdatedAt = new Date();
    }

    await user.save();

    const token = generateToken(user._id);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        referralCode: user.referralCode
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get current user
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password -passwordResetToken");
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update device token
const updateDeviceToken = async (req, res) => {
  try {
    const { deviceToken } = req.body;
    if (!deviceToken) return res.status(400).json({ error: "Device token is required" });

    await User.findByIdAndUpdate(req.user._id, {
      deviceToken,
      deviceTokenUpdatedAt: new Date()
    });

    res.json({ message: "Device token updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ error: "No account found with that email" });

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    const resetUrl = `https://gilded-cajeta-16c5fb.netlify.app/reset-password/${resetToken}`;

    await sendEmail({
      to: email,
      subject: "🔒 Password Reset - STeX Logistics",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e74c3c;">Password Reset Request</h2>
          <p>Hi ${user.name},</p>
          <p>You requested a password reset. Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #e74c3c; color: white; padding: 15px 40px; border-radius: 30px; text-decoration: none; font-weight: 700;">
              Reset Password →
            </a>
          </div>
          <p style="color: #7f8c8d; font-size: 13px;">This link expires in 30 minutes. If you did not request this, ignore this email.</p>
        </div>
      `
    });

    res.json({ message: "Password reset email sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ error: "Invalid or expired reset token" });

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successful. Please login." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { register, login, getMe, updateDeviceToken, forgotPassword, resetPassword };
