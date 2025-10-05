const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { authenticate, authorize } = require("../../middleware/auth.middleware");
const { getErrors, markErrorAsResolved } = require("./system.controller");

// Rate limiter for sensitive admin actions
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: "Too many requests, please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Solo administradores pueden ver los logs
router.get("/errors", authenticate, authorize(["admin"]), getErrors);

// Marcar error como resuelto
router.patch(
  "/errors/:id/resolve",
  adminLimiter,
  authenticate,
  authorize(["admin"]),
  markErrorAsResolved
);

module.exports = router;
