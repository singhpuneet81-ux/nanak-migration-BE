const FaqCollection = require("../models/FaqCollection");
const DEFAULT_FAQS = require("../defaults/faqCollections");

function withId(doc) {
  const x = doc.toObject ? doc.toObject() : { ...doc };
  return { ...x, id: x._id?.toString?.() || x.id };
}

function normalizeKey(pageKey) {
  return String(pageKey || "")
    .toLowerCase()
    .trim()
    .replace(/^\/+|\/+$/g, "");
}

function keyAliases(pageKey) {
  const key = normalizeKey(pageKey);
  if (key === "home" || key === "homepage") return ["homepage", "home"];
  return [key];
}

/** First-time empty DB seed. */
async function ensureDefaults() {
  const count = await FaqCollection.countDocuments();
  if (count > 0) return { inserted: 0 };
  await FaqCollection.insertMany(DEFAULT_FAQS);
  return { inserted: DEFAULT_FAQS.length };
}

/**
 * Insert any default collections that are missing by pageKey.
 * Never overwrites existing Runway edits.
 */
async function seedMissingDefaults() {
  let inserted = 0;
  for (const col of DEFAULT_FAQS) {
    const pageKey = normalizeKey(col.pageKey);
    const exists = await FaqCollection.findOne({ pageKey });
    if (exists) continue;
    // Also skip if an alias already exists (home ↔ homepage)
    const aliases = keyAliases(pageKey);
    const aliasHit = await FaqCollection.findOne({ pageKey: { $in: aliases } });
    if (aliasHit) continue;
    await FaqCollection.create({ ...col, pageKey });
    inserted++;
  }
  return { inserted, totalDefaults: DEFAULT_FAQS.length };
}

async function listAdmin() {
  await ensureDefaults();
  await seedMissingDefaults();
  const collections = await FaqCollection.find().sort({ pageKey: 1 });
  return collections.map(withId);
}

async function getByPageKey(pageKey, { publishedOnly = false } = {}) {
  await ensureDefaults();
  const aliases = keyAliases(pageKey);
  const filter = { pageKey: { $in: aliases } };
  if (publishedOnly) filter.published = true;
  const collection = await FaqCollection.findOne(filter);
  if (!collection) {
    const err = new Error("FAQ collection not found");
    err.status = 404;
    throw err;
  }
  const sorted = [...(collection.items || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return { ...withId(collection), items: sorted };
}

async function getById(id) {
  const collection = await FaqCollection.findById(id);
  if (!collection) {
    const err = new Error("FAQ collection not found");
    err.status = 404;
    throw err;
  }
  return withId(collection);
}

async function create(data) {
  const pageKey = normalizeKey(data.pageKey);
  const existing = await FaqCollection.findOne({ pageKey: { $in: keyAliases(pageKey) } });
  if (existing) {
    const err = new Error("FAQ collection for this page already exists");
    err.status = 409;
    throw err;
  }
  const collection = await FaqCollection.create({ ...data, pageKey });
  return withId(collection);
}

async function update(id, data) {
  const collection = await FaqCollection.findById(id);
  if (!collection) {
    const err = new Error("FAQ collection not found");
    err.status = 404;
    throw err;
  }
  if (data.pageKey) data.pageKey = normalizeKey(data.pageKey);
  Object.assign(collection, data);
  await collection.save();
  return withId(collection);
}

async function remove(id) {
  const collection = await FaqCollection.findByIdAndDelete(id);
  if (!collection) {
    const err = new Error("FAQ collection not found");
    err.status = 404;
    throw err;
  }
  return { ok: true };
}

/** Upsert by pageKey for admin "ensure page exists" from SEO list. */
async function upsertByPageKey(pageKey, data = {}) {
  const key = normalizeKey(pageKey);
  let collection = await FaqCollection.findOne({ pageKey: { $in: keyAliases(key) } });
  if (collection) {
    if (data.title != null) collection.title = data.title;
    if (data.items != null) collection.items = data.items;
    if (data.published != null) collection.published = data.published;
    await collection.save();
    return withId(collection);
  }
  const fromDefaults = DEFAULT_FAQS.find((c) => keyAliases(c.pageKey).includes(key));
  collection = await FaqCollection.create({
    pageKey: key === "home" ? "homepage" : key,
    title: data.title || fromDefaults?.title || "Frequently asked questions",
    items: data.items || fromDefaults?.items || [],
    published: data.published !== false,
  });
  return withId(collection);
}

module.exports = {
  ensureDefaults,
  seedMissingDefaults,
  listAdmin,
  getByPageKey,
  getById,
  create,
  update,
  remove,
  upsertByPageKey,
  keyAliases,
  normalizeKey,
};
