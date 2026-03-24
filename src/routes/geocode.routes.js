const express = require("express");
const router = express.Router();
const { geocode } = require("../controllers/geocode.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/", protect, geocode);

module.exports = router;
