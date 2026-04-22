const express = require("express");
const router = express.Router();
const { getPriceEstimate } = require("../controllers/pricing.controller");
const { protect } = require("../middleware/auth.middleware");
const { validatePriceEstimate } = require("../middleware/validate.middleware");

router.post("/estimate", protect, validatePriceEstimate, getPriceEstimate);

module.exports = router;