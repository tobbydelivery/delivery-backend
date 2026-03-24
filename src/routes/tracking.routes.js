const express = require("express");
const router = express.Router();
const { trackOrder } = require("../controllers/tracking.controller");

// Public route - no auth needed
router.get("/:trackingNumber", trackOrder);

module.exports = router;
