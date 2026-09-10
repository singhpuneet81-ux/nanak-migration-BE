const { asyncHandler } = require("../middleware/asyncHandler");
const contentSync = require("../services/contentSync.service");

exports.syncWebsite = asyncHandler(async (req, res) => {
  const restoreSeo =
    req.body?.restoreSeo === true ||
    req.query?.restoreSeo === "1" ||
    req.query?.restoreSeo === "true";
  const data = await contentSync.syncAll({ restoreSeo });
  res.json({
    success: true,
    data,
    message: restoreSeo
      ? "SEO titles/descriptions restored from code defaults. CMS body/H1/hero preserved. Blogs seeded if missing."
      : "Missing website defaults seeded only — existing Runway SEO was not overwritten.",
  });
});
