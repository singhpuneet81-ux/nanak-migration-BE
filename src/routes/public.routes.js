const express = require("express");
const siteContent = require("../controllers/siteContent.controller");

const router = express.Router();

router.get("/site-content", siteContent.getPublicHomepage);

module.exports = router;
