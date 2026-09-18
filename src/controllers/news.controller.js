const { asyncHandler } = require("../middleware/asyncHandler");
const news = require("../services/news.service");
const { triggerSiteRevalidate } = require("../services/revalidate.service");

function newsPaths(slug) {
  const paths = ["/news"];
  if (slug) paths.push(`/news/${slug}`);
  return paths;
}

async function purgeNewsOnSite(slug) {
  await triggerSiteRevalidate(["news"], newsPaths(slug));
}

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
  if (data?.status === "published" && data?.slug) {
    await purgeNewsOnSite(data.slug);
  }
  res.status(201).json({ success: true, data });
});

exports.update = asyncHandler(async (req, res) => {
  const data = await news.update(req.params.id, req.body || {});
  if (data?.slug) {
    await purgeNewsOnSite(data.slug);
  }
  res.json({ success: true, data });
});

exports.remove = asyncHandler(async (req, res) => {
  const existing = await news.getById(req.params.id).catch(() => null);
  await news.remove(req.params.id);
  if (existing?.slug) {
    await purgeNewsOnSite(existing.slug);
  }
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
