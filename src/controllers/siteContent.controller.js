const { asyncHandler } = require("../middleware/asyncHandler");
const siteContent = require("../services/siteContent.service");

exports.getPublicHomepage = asyncHandler(async (_req, res) => {
  const data = await siteContent.getPublishedHomepage();
  res.json({ success: true, data });
});

exports.getAdminHomepage = asyncHandler(async (_req, res) => {
  const data = await siteContent.getHomepageForAdmin();
  res.json({ success: true, data });
});

exports.updateHomepage = asyncHandler(async (req, res) => {
  const data = await siteContent.updateHomepage(req.body || {});
  res.json({ success: true, data });
});

exports.resetHomepage = asyncHandler(async (_req, res) => {
  const data = await siteContent.updateHomepage(siteContent.DEFAULTS);
  res.json({ success: true, data });
});
