const express = require("express");
const router = express.Router();
const { createDiscount, getDiscounts, validateDiscount, applyDiscount, deleteDiscount } = require("../controllers/discount.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

router.post("/create", protect, restrictTo("admin"), createDiscount);
router.get("/", protect, restrictTo("admin"), getDiscounts);
router.post("/validate", protect, validateDiscount);
router.post("/apply", protect, applyDiscount);
router.delete("/:id", protect, restrictTo("admin"), deleteDiscount);

module.exports = router;