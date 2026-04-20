const express = require("express");
const router = express.Router();
const { makePayment, verifyOrderPayment, paystackWebhook, getPaymentStatus } = require("../controllers/payment.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/webhook", paystackWebhook);
router.post("/:orderId/pay", protect, makePayment);
router.get("/verify", verifyOrderPayment);
router.get("/:orderId/status", protect, getPaymentStatus);

module.exports = router;