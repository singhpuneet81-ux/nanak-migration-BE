const { asyncHandler } = require("../middleware/asyncHandler");
const faq = require("../services/faq.service");

exports.list = asyncHandler(async (_req, res) => {
  const collections = await faq.listAdmin();
  res.json({ success: true, data: { collections } });
});

exports.getOne = asyncHandler(async (req, res) => {
  const data = await faq.getById(req.params.id);
  res.json({ success: true, data });
});

exports.create = asyncHandler(async (req, res) => {
  const data = await faq.create(req.body || {});
  res.status(201).json({ success: true, data });
});

exports.update = asyncHandler(async (req, res) => {
  const data = await faq.update(req.params.id, req.body || {});
  res.json({ success: true, data });
});

exports.remove = asyncHandler(async (req, res) => {
  await faq.remove(req.params.id);
  res.json({ success: true, data: { ok: true } });
});

exports.getPublicByPageKey = asyncHandler(async (req, res) => {
  const data = await faq.getByPageKey(req.params.pageKey, { publishedOnly: true });
  res.json({ success: true, data });
});

exports.listPublic = asyncHandler(async (_req, res) => {
  const collections = await faq.listAdmin();
  const published = collections.filter((c) => c.published !== false);
  res.json({ success: true, data: { collections: published } });
});
