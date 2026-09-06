const Blog = require("../models/Blog");
const DEFAULT_BLOGS = require("../defaults/blogPosts");

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

async function ensureDefaults() {
  const count = await Blog.countDocuments();
  if (count > 0) return;
  await Blog.insertMany(
    DEFAULT_BLOGS.map((b) => ({
      ...b,
      status: "draft",
      publishedAt: b.date ? new Date(b.date) : new Date(),
    }))
  );
}

async function listAdmin(query = {}) {
  await ensureDefaults();
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  if (query.search) {
    const rx = new RegExp(String(query.search).trim(), "i");
    filter.$or = [{ title: rx }, { standfirst: rx }, { slug: rx }];
  }
  const blogs = await Blog.find(filter).sort({ updatedAt: -1 });
  return blogs.map(withId);
}

async function listPublished(query = {}) {
  await ensureDefaults();
  const filter = { status: "published" };
  if (query.category) filter.category = query.category;
  if (query.search) {
    const rx = new RegExp(String(query.search).trim(), "i");
    filter.$or = [{ title: rx }, { standfirst: rx }, { body: rx }];
  }
  // Never fall back to drafts — unpublished posts must stay off the public site.
  const blogs = await Blog.find(filter).sort({ publishedAt: -1, createdAt: -1 });
  return blogs.map(withId);
}

async function getById(id) {
  const blog = await Blog.findById(id);
  if (!blog) {
    const err = new Error("Blog post not found");
    err.status = 404;
    throw err;
  }
  return withId(blog);
}

async function getBySlug(slug, { publishedOnly = false } = {}) {
  const filter = { slug: slugify(slug) };
  if (publishedOnly) filter.status = "published";
  const blog = await Blog.findOne(filter);
  if (!blog) {
    const err = new Error("Blog post not found");
    err.status = 404;
    throw err;
  }
  return withId(blog);
}

async function create(data) {
  const slug = slugify(data.slug || data.title);
  const existing = await Blog.findOne({ slug });
  if (existing) {
    const err = new Error("A blog post with this slug already exists");
    err.status = 409;
    throw err;
  }
  const blog = await Blog.create({
    ...data,
    slug,
    publishedAt: data.status === "published" ? data.publishedAt || new Date() : null,
  });
  return withId(blog);
}

async function update(id, data) {
  const blog = await Blog.findById(id);
  if (!blog) {
    const err = new Error("Blog post not found");
    err.status = 404;
    throw err;
  }
  if (data.slug) data.slug = slugify(data.slug);
  if (data.status === "published" && !blog.publishedAt) {
    data.publishedAt = data.publishedAt || new Date();
  }
  Object.assign(blog, data);
  await blog.save();
  return withId(blog);
}

async function remove(id) {
  const blog = await Blog.findByIdAndDelete(id);
  if (!blog) {
    const err = new Error("Blog post not found");
    err.status = 404;
    throw err;
  }
  return { ok: true };
}

module.exports = {
  ensureDefaults,
  listAdmin,
  listPublished,
  getById,
  getBySlug,
  create,
  update,
  remove,
};
