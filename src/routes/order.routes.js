const express = require("express");
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrder,
  updateStatus,
  assignAgent,
  cancelOrder
} = require("../controllers/order.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const { validateCreateOrder, validateUpdateStatus } = require("../middleware/validate.middleware");

router.use(protect);

router.post("/", validateCreateOrder, createOrder);
router.get("/", getOrders);
router.get("/:id", getOrder);
router.patch("/:id/status", restrictTo("admin", "agent"), validateUpdateStatus, updateStatus);
router.patch("/:id/assign", restrictTo("admin"), assignAgent);
router.patch("/:id/cancel", cancelOrder);

module.exports = router;
