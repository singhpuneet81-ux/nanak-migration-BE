const PageSeo = require("../models/PageSeo");
const DEFAULT_SEO = require("../defaults/pageSeo");

const ALLOWED_FIELDS = [
  "title",
  "metaDescription",
  "primaryKeyword",
  "keywords",
  "h1",
  "body",
  "heroImage",
  "canonicalUrl",
  "ogTitle",
  "ogDescription",
  "ogImage",
  "robotsIndex",
];

function withId(doc) {
  const x = doc.toObject ? doc.toObject() : { ...doc };
  return { ...x, id: x._id?.toString?.() || x.id };
}

function pickPayload(data = {}) {
  const out = {};
  for (const key of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(data, key)) out[key] = data[key];
  }
  return out;
}

/** Seed missing route keys from defaults (safe for existing DBs). */
async function ensureDefaults() {
  const existing = await PageSeo.find({}, { routeKey: 1 }).lean();
  const have = new Set(existing.map((e) => e.routeKey));
  const missing = Object.entries(DEFAULT_SEO)
    .filter(([routeKey]) => !have.has(routeKey))
    .map(([routeKey, meta]) => ({ routeKey, ...meta }));
  if (missing.length) await PageSeo.insertMany(missing);
}

async function listAll() {
  await ensureDefaults();
  const pages = await PageSeo.find().sort({ routeKey: 1 });
  return pages.map(withId);
}

async function getByRouteKey(routeKey) {
  await ensureDefaults();
  const key = String(routeKey).toLowerCase().trim();
  let page = await PageSeo.findOne({ routeKey: key });
  if (!page && DEFAULT_SEO[key]) {
    page = await PageSeo.create({ routeKey: key, ...DEFAULT_SEO[key] });
  }
  if (!page) {
    const err = new Error("SEO entry not found");
    err.status = 404;
    throw err;
  }
  return withId(page);
}

async function upsert(routeKey, data) {
  const key = String(routeKey).toLowerCase().trim();
  const page = await PageSeo.findOneAndUpdate(
    { routeKey: key },
    { routeKey: key, ...pickPayload(data) },
    { new: true, upsert: true, runValidators: true }
  );
  return withId(page);
}

async function bulkUpsert(entries) {
  const results = [];
  for (const entry of entries) {
    if (!entry.routeKey) continue;
    results.push(await upsert(entry.routeKey, entry));
  }
  return results;
}

async function remove(routeKey) {
  const page = await PageSeo.findOneAndDelete({ routeKey: String(routeKey).toLowerCase().trim() });
  if (!page) {
    const err = new Error("SEO entry not found");
    err.status = 404;
    throw err;
  }
  return { ok: true };
}

module.exports = {
  ensureDefaults,
  listAll,
  getByRouteKey,
  upsert,
  bulkUpsert,
  remove,
};
