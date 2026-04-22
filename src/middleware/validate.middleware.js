const { body, param, query, validationResult } = require("express-validator");

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Auth validation
const validateRegister = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2, max: 50 }).withMessage("Name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z\s]+$/).withMessage("Name can only contain letters and spaces"),
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email address")
    .normalizeEmail(),
  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage("Password must contain uppercase, lowercase and number"),
  body("phone")
    .optional()
    .matches(/^(\+234|0)[789][01]\d{8}$/).withMessage("Invalid Nigerian phone number"),
  handleValidationErrors
];

const validateLogin = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Invalid email address")
    .normalizeEmail(),
  body("password")
    .notEmpty().withMessage("Password is required"),
  handleValidationErrors
];

// Order validation
const validateCreateOrder = [
  body("sender.name")
    .trim()
    .notEmpty().withMessage("Sender name is required")
    .isLength({ min: 2, max: 50 }).withMessage("Sender name must be between 2 and 50 characters"),
  body("sender.phone")
    .trim()
    .notEmpty().withMessage("Sender phone is required")
    .matches(/^(\+234|0)[789][01]\d{8}$/).withMessage("Invalid sender phone number"),
  body("sender.address")
    .trim()
    .notEmpty().withMessage("Sender address is required")
    .isLength({ min: 5, max: 200 }).withMessage("Address must be between 5 and 200 characters"),
  body("recipient.name")
    .trim()
    .notEmpty().withMessage("Recipient name is required")
    .isLength({ min: 2, max: 50 }).withMessage("Recipient name must be between 2 and 50 characters"),
  body("recipient.phone")
    .trim()
    .notEmpty().withMessage("Recipient phone is required")
    .matches(/^(\+234|0)[789][01]\d{8}$/).withMessage("Invalid recipient phone number"),
  body("recipient.address")
    .trim()
    .notEmpty().withMessage("Recipient address is required")
    .isLength({ min: 5, max: 200 }).withMessage("Address must be between 5 and 200 characters"),
  body("package.description")
    .trim()
    .notEmpty().withMessage("Package description is required")
    .isLength({ min: 2, max: 100 }).withMessage("Description must be between 2 and 100 characters"),
  body("package.weight")
    .optional()
    .isFloat({ min: 0.1, max: 1000 }).withMessage("Weight must be between 0.1 and 1000 kg"),
  body("package.fragile")
    .optional()
    .isBoolean().withMessage("Fragile must be true or false"),
  handleValidationErrors
];

const validateUpdateStatus = [
  body("status")
    .notEmpty().withMessage("Status is required")
    .isIn(["pending", "picked_up", "in_transit", "delivered", "cancelled", "delayed"])
    .withMessage("Invalid status value"),
  body("note")
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage("Note cannot exceed 200 characters"),
  handleValidationErrors
];

// Pricing validation
const validatePriceEstimate = [
  body("pickupAddress")
    .trim()
    .notEmpty().withMessage("Pickup address is required")
    .isLength({ min: 5, max: 200 }).withMessage("Address must be between 5 and 200 characters"),
  body("deliveryAddress")
    .trim()
    .notEmpty().withMessage("Delivery address is required")
    .isLength({ min: 5, max: 200 }).withMessage("Address must be between 5 and 200 characters"),
  body("weight")
    .optional()
    .isFloat({ min: 0.1, max: 1000 }).withMessage("Weight must be between 0.1 and 1000 kg"),
  body("fragile")
    .optional()
    .isBoolean().withMessage("Fragile must be true or false"),
  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateLogin,
  validateCreateOrder,
  validateUpdateStatus,
  validatePriceEstimate,
  handleValidationErrors
};