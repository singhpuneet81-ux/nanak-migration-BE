const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { protect } = require("../middleware/auth");
const auth = require("../controllers/auth.controller");

const router = express.Router();
router.post("/login", asyncHandler(auth.login));
router.get("/me", protect, asyncHandler(auth.me));
module.exports = router;
