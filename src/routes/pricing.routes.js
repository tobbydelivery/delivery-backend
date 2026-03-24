const express = require("express");
const router = express.Router();
const { getPriceEstimate } = require("../controllers/pricing.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/estimate", protect, getPriceEstimate);

module.exports = router;