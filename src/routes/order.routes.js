const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  createOrder, getOrders, getOrder, updateStatus,
  assignAgent, cancelOrder, uploadProof
} = require("../controllers/order.controller");
const { protect, restrictTo } = require("../middleware/auth.middleware");
const { validateCreateOrder, validateUpdateStatus } = require("../middleware/validate.middleware");

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images allowed"), false);
  }
});

router.use(protect);

router.post("/", validateCreateOrder, createOrder);
router.get("/", getOrders);
router.get("/:id", getOrder);
router.patch("/:id/status", restrictTo("admin", "agent"), validateUpdateStatus, updateStatus);
router.patch("/:id/assign", restrictTo("admin"), assignAgent);
router.patch("/:id/cancel", cancelOrder);
router.post("/:id/proof", restrictTo("admin", "agent"), upload.single("photo"), uploadProof);

module.exports = router;