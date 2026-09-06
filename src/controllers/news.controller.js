const { asyncHandler } = require("../middleware/asyncHandler");
const news = require("../services/news.service");

exports.list = asyncHandler(async (req, res) => {
  const items = await news.listAdmin(req.query);
  res.json({ success: true, data: { news: items } });
});

exports.getOne = asyncHandler(async (req, res) => {
  const data = await news.getById(req.params.id);
  res.json({ success: true, data });
});

exports.create = asyncHandler(async (req, res) => {
  const data = await news.create(req.body || {});
  res.status(201).json({ success: true, data });
});

exports.update = asyncHandler(async (req, res) => {
  const data = await news.update(req.params.id, req.body || {});
  res.json({ success: true, data });
});

exports.remove = asyncHandler(async (req, res) => {
  await news.remove(req.params.id);
  res.json({ success: true, data: { ok: true } });
});

exports.listPublic = asyncHandler(async (req, res) => {
  const items = await news.listPublished(req.query);
  res.json({ success: true, data: { news: items } });
});

exports.getPublicBySlug = asyncHandler(async (req, res) => {
  const data = await news.getBySlug(req.params.slug, { publishedOnly: true });
  res.json({ success: true, data });
});
