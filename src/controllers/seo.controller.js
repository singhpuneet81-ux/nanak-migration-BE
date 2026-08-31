const { asyncHandler } = require("../middleware/asyncHandler");
const seo = require("../services/seo.service");

exports.list = asyncHandler(async (_req, res) => {
  const pages = await seo.listAll();
  res.json({ success: true, data: { pages } });
});

exports.getOne = asyncHandler(async (req, res) => {
  const data = await seo.getByRouteKey(req.params.routeKey);
  res.json({ success: true, data });
});

exports.upsert = asyncHandler(async (req, res) => {
  const data = await seo.upsert(req.params.routeKey, req.body || {});
  res.json({ success: true, data });
});

exports.bulkUpsert = asyncHandler(async (req, res) => {
  const pages = await seo.bulkUpsert(req.body?.pages || req.body || []);
  res.json({ success: true, data: { pages } });
});

exports.remove = asyncHandler(async (req, res) => {
  await seo.remove(req.params.routeKey);
  res.json({ success: true, data: { ok: true } });
});

exports.getPublicByRouteKey = asyncHandler(async (req, res) => {
  const data = await seo.getByRouteKey(req.params.routeKey);
  res.json({ success: true, data });
});

exports.listPublic = asyncHandler(async (_req, res) => {
  const pages = await seo.listAll();
  res.json({ success: true, data: { pages } });
});
