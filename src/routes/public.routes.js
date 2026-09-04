const express = require("express");
const rateLimit = require("express-rate-limit");
const siteContent = require("../controllers/siteContent.controller");
const blog = require("../controllers/blog.controller");
const faq = require("../controllers/faq.controller");
const seo = require("../controllers/seo.controller");
const bookings = require("../controllers/bookings.controller");
const { asyncHandler } = require("../middleware/asyncHandler");

const router = express.Router();

const bookingLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 40 });

router.get("/site-content", siteContent.getPublicHomepage);

router.get("/blogs", blog.listPublic);
router.get("/blogs/:slug", blog.getPublicBySlug);

router.get("/faqs", faq.listPublic);
router.get("/faqs/:pageKey", faq.getPublicByPageKey);

router.get("/seo", seo.listPublic);
router.get("/seo/:routeKey", seo.getPublicByRouteKey);

router.get("/bookings/options", asyncHandler(bookings.publicOptions));
router.post("/bookings", bookingLimiter, asyncHandler(bookings.publicCreate));

module.exports = router;
