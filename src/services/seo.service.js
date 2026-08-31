const PageSeo = require("../models/PageSeo");
const DEFAULT_SEO = require("../defaults/pageSeo");

function withId(doc) {
  const x = doc.toObject ? doc.toObject() : { ...doc };
  return { ...x, id: x._id?.toString?.() || x.id };
}

async function ensureDefaults() {
  const count = await PageSeo.countDocuments();
  if (count > 0) return;
  const rows = Object.entries(DEFAULT_SEO).map(([routeKey, meta]) => ({
    routeKey,
    ...meta,
  }));
  await PageSeo.insertMany(rows);
}

async function listAll() {
  await ensureDefaults();
  const pages = await PageSeo.find().sort({ routeKey: 1 });
  return pages.map(withId);
}

async function getByRouteKey(routeKey) {
  await ensureDefaults();
  const page = await PageSeo.findOne({ routeKey: String(routeKey).toLowerCase().trim() });
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
    { routeKey: key, ...data },
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
