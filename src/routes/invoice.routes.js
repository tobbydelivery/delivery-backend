const express = require("express");
const router = express.Router();
const { downloadInvoice } = require("../controllers/invoice.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/:orderId", protect, downloadInvoice);

module.exports = router;