const { asyncHandler } = require("../middleware/asyncHandler");
const blog = require("../services/blog.service");

exports.list = asyncHandler(async (req, res) => {
  const blogs = await blog.listAdmin(req.query);
  res.json({ success: true, data: { blogs } });
});

exports.getOne = asyncHandler(async (req, res) => {
  const data = await blog.getById(req.params.id);
  res.json({ success: true, data });
});

exports.create = asyncHandler(async (req, res) => {
  const data = await blog.create(req.body || {});
  res.status(201).json({ success: true, data });
});

exports.update = asyncHandler(async (req, res) => {
  const data = await blog.update(req.params.id, req.body || {});
  res.json({ success: true, data });
});

exports.remove = asyncHandler(async (req, res) => {
  await blog.remove(req.params.id);
  res.json({ success: true, data: { ok: true } });
});

exports.listPublic = asyncHandler(async (req, res) => {
  const blogs = await blog.listPublished(req.query);
  res.json({ success: true, data: { blogs } });
});

exports.getPublicBySlug = asyncHandler(async (req, res) => {
  const data = await blog.getBySlug(req.params.slug, { publishedOnly: true });
  res.json({ success: true, data });
});
