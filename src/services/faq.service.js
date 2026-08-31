const FaqCollection = require("../models/FaqCollection");
const DEFAULT_FAQS = require("../defaults/faqCollections");

function withId(doc) {
  const x = doc.toObject ? doc.toObject() : { ...doc };
  return { ...x, id: x._id?.toString?.() || x.id };
}

async function ensureDefaults() {
  const count = await FaqCollection.countDocuments();
  if (count > 0) return;
  await FaqCollection.insertMany(DEFAULT_FAQS);
}

async function listAdmin() {
  await ensureDefaults();
  const collections = await FaqCollection.find().sort({ pageKey: 1 });
  return collections.map(withId);
}

async function getByPageKey(pageKey, { publishedOnly = false } = {}) {
  await ensureDefaults();
  const filter = { pageKey: String(pageKey).toLowerCase().trim() };
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
  const pageKey = String(data.pageKey || "").toLowerCase().trim();
  const existing = await FaqCollection.findOne({ pageKey });
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
  if (data.pageKey) data.pageKey = String(data.pageKey).toLowerCase().trim();
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

module.exports = {
  ensureDefaults,
  listAdmin,
  getByPageKey,
  getById,
  create,
  update,
  remove,
};
