const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateDeviceToken,
  forgotPassword,
  resetPassword
} = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");
const { validateRegister, validateLogin } = require("../middleware/validate.middleware");

router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);
router.get("/me", protect, getMe);
router.post("/device-token", protect, updateDeviceToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
