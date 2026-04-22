const express = require("express");
const router = express.Router();
const { createReview, getReviews, getAgentReviews } = require("../controllers/review.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

router.post("/", protect, createReview);
router.get("/", protect, restrictTo("admin"), getReviews);
router.get("/agent/:agentId", protect, getAgentReviews);

module.exports = router;