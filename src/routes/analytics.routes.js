const express = require("express");
const router = express.Router();
const { getAnalytics } = require("../controllers/analytics.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

router.get("/", protect, restrictTo("admin"), getAnalytics);

module.exports = router;