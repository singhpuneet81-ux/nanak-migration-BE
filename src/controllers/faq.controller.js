const { asyncHandler } = require("../middleware/asyncHandler");
const faq = require("../services/faq.service");
const { triggerSiteRevalidate } = require("../services/revalidate.service");

function faqCache(res) {
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
}

async function purgeFaqCache(pageKey) {
  const tags = ["faqs"];
  if (pageKey) {
    tags.push(`faqs:${pageKey}`);
    if (pageKey === "homepage") tags.push("faqs:home");
    if (pageKey === "home") tags.push("faqs:homepage");
  }
  await triggerSiteRevalidate(tags);
}

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
  await purgeFaqCache(data.pageKey);
  res.status(201).json({ success: true, data });
});

exports.update = asyncHandler(async (req, res) => {
  const data = await faq.update(req.params.id, req.body || {});
  await purgeFaqCache(data.pageKey);
  res.json({ success: true, data });
});

exports.remove = asyncHandler(async (req, res) => {
  const existing = await faq.getById(req.params.id);
  await faq.remove(req.params.id);
  await purgeFaqCache(existing?.pageKey);
  res.json({ success: true, data: { ok: true } });
});

exports.seedMissing = asyncHandler(async (_req, res) => {
  const data = await faq.seedMissingDefaults();
  await purgeFaqCache();
  res.json({ success: true, data });
});

exports.upsertByPageKey = asyncHandler(async (req, res) => {
  const data = await faq.upsertByPageKey(req.params.pageKey, req.body || {});
  await purgeFaqCache(data.pageKey || req.params.pageKey);
  res.json({ success: true, data });
});

exports.getPublicByPageKey = asyncHandler(async (req, res) => {
  faqCache(res);
  const data = await faq.getByPageKey(req.params.pageKey, { publishedOnly: true });
  res.json({ success: true, data });
});

exports.listPublic = asyncHandler(async (_req, res) => {
  faqCache(res);
  const collections = await faq.listAdmin();
  const published = collections.filter((c) => c.published !== false);
  res.json({ success: true, data: { collections: published } });
});
