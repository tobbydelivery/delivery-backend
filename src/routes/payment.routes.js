const express = require("express");
const router = express.Router();
const { makePayment, verifyOrderPayment, getPaymentStatus } = require("../controllers/payment.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/:orderId/pay", protect, makePayment);
router.get("/verify", verifyOrderPayment);
router.get("/:orderId/status", protect, getPaymentStatus);

module.exports = router;