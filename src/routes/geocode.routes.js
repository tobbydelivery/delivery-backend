const express = require("express");
const router = express.Router();
const { geocode, reverseGeocode, searchPlaces, getPlaceDetails, calculateDistance } = require("../controllers/geocode.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/", protect, geocode);
router.get("/reverse", protect, reverseGeocode);
router.get("/search", protect, searchPlaces);
router.get("/place", protect, getPlaceDetails);
router.get("/distance", protect, calculateDistance);

module.exports = router;