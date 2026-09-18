const { asyncHandler } = require("../middleware/asyncHandler");
const blog = require("../services/blog.service");
const { triggerSiteRevalidate } = require("../services/revalidate.service");

function blogPaths(slug) {
  const paths = ["/blog"];
  if (slug) paths.push(`/blog/${slug}`);
  return paths;
}

async function purgeBlogOnSite(slug) {
  await triggerSiteRevalidate(["blog"], blogPaths(slug));
}

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
  if (data?.status === "published" && data?.slug) {
    await purgeBlogOnSite(data.slug);
  }
  res.status(201).json({ success: true, data });
});

exports.update = asyncHandler(async (req, res) => {
  const data = await blog.update(req.params.id, req.body || {});
  if (data?.slug) {
    await purgeBlogOnSite(data.slug);
  }
  res.json({ success: true, data });
});

exports.remove = asyncHandler(async (req, res) => {
  const existing = await blog.getById(req.params.id).catch(() => null);
  await blog.remove(req.params.id);
  if (existing?.slug) {
    await purgeBlogOnSite(existing.slug);
  }
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
