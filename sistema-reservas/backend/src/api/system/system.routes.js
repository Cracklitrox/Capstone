const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../../middleware/auth.middleware");
const { getErrors, markErrorAsResolved } = require("./system.controller");

// Solo administradores pueden ver los logs
router.get("/errors", authenticate, authorize(["admin"]), getErrors);

// Marcar error como resuelto
router.patch(
  "/errors/:id/resolve",
  authenticate,
  authorize(["admin"]),
  markErrorAsResolved
);

module.exports = router;
