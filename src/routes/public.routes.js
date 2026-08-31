const express = require("express");
const siteContent = require("../controllers/siteContent.controller");
const blog = require("../controllers/blog.controller");
const faq = require("../controllers/faq.controller");
const seo = require("../controllers/seo.controller");

const router = express.Router();

router.get("/site-content", siteContent.getPublicHomepage);

router.get("/blogs", blog.listPublic);
router.get("/blogs/:slug", blog.getPublicBySlug);

router.get("/faqs", faq.listPublic);
router.get("/faqs/:pageKey", faq.getPublicByPageKey);

router.get("/seo", seo.listPublic);
router.get("/seo/:routeKey", seo.getPublicByRouteKey);

module.exports = router;
