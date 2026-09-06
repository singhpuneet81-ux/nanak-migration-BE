const News = require("../models/News");

function withId(doc) {
  const x = doc.toObject ? doc.toObject() : { ...doc };
  return { ...x, id: x._id?.toString?.() || x.id };
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function listAdmin(query = {}) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  if (query.search) {
    const rx = new RegExp(String(query.search).trim(), "i");
    filter.$or = [{ title: rx }, { standfirst: rx }, { slug: rx }];
  }
  const items = await News.find(filter).sort({ updatedAt: -1 });
  return items.map(withId);
}

/** Public list — published only (no draft fallback). */
async function listPublished(query = {}) {
  const filter = { status: "published" };
  if (query.category) filter.category = query.category;
  if (query.search) {
    const rx = new RegExp(String(query.search).trim(), "i");
    filter.$or = [{ title: rx }, { standfirst: rx }, { body: rx }];
  }
  if (query.featured === "true" || query.featured === true) {
    filter.featured = true;
  }
  const items = await News.find(filter).sort({ publishedAt: -1, createdAt: -1 });
  return items.map(withId);
}

async function getById(id) {
  const item = await News.findById(id);
  if (!item) {
    const err = new Error("News article not found");
    err.status = 404;
    throw err;
  }
  return withId(item);
}

async function getBySlug(slug, { publishedOnly = false } = {}) {
  const filter = { slug: slugify(slug) };
  if (publishedOnly) filter.status = "published";
  const item = await News.findOne(filter);
  if (!item) {
    const err = new Error("News article not found");
    err.status = 404;
    throw err;
  }
  return withId(item);
}

async function create(data) {
  const slug = slugify(data.slug || data.title);
  const existing = await News.findOne({ slug });
  if (existing) {
    const err = new Error("A news article with this slug already exists");
    err.status = 409;
    throw err;
  }
  const item = await News.create({
    ...data,
    slug,
    featured: Boolean(data.featured),
    publishedAt: data.status === "published" ? data.publishedAt || new Date() : null,
  });
  return withId(item);
}

async function update(id, data) {
  const item = await News.findById(id);
  if (!item) {
    const err = new Error("News article not found");
    err.status = 404;
    throw err;
  }
  if (data.slug) data.slug = slugify(data.slug);
  if (typeof data.featured !== "undefined") data.featured = Boolean(data.featured);
  if (data.status === "published" && !item.publishedAt) {
    data.publishedAt = data.publishedAt || new Date();
  }
  Object.assign(item, data);
  await item.save();
  return withId(item);
}

async function remove(id) {
  const item = await News.findByIdAndDelete(id);
  if (!item) {
    const err = new Error("News article not found");
    err.status = 404;
    throw err;
  }
  return { ok: true };
}

module.exports = {
  listAdmin,
  listPublished,
  getById,
  getBySlug,
  create,
  update,
  remove,
};
