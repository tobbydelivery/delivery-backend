const express = require("express");
const router = express.Router();
const { createOrder, getOrders, getOrder, updateStatus, assignAgent } = require("../controllers/order.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

router.use(protect);

router.post("/", createOrder);
router.get("/", getOrders);
router.get("/:id", getOrder);
router.patch("/:id/status", restrictTo("admin", "agent"), updateStatus);
router.patch("/:id/assign", restrictTo("admin"), assignAgent);

module.exports = router;
