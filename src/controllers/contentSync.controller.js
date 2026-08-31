const { asyncHandler } = require("../middleware/asyncHandler");
const contentSync = require("../services/contentSync.service");

exports.syncWebsite = asyncHandler(async (_req, res) => {
  const data = await contentSync.syncAll();
  res.json({
    success: true,
    data,
    message: "Website content synced from migration defaults. Changes are live on the public site.",
  });
});
