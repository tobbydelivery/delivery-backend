const express = require("express");
const router = express.Router();
const { getAgents, getAgentOrders } = require("../controllers/agent.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");

router.use(protect);

router.get("/", restrictTo("admin"), getAgents);
router.get("/:id/orders", restrictTo("admin", "agent"), getAgentOrders);

module.exports = router;
