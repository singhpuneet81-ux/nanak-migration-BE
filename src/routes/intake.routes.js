const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const intake = require("../controllers/intake.controller");

const router = express.Router();
router.post("/", asyncHandler(intake.create));
module.exports = router;
