const Blog = require("../models/Blog");
const FaqCollection = require("../models/FaqCollection");
const PageSeo = require("../models/PageSeo");
const SiteContent = require("../models/SiteContent");
const DEFAULT_BLOGS = require("../defaults/blogPosts");
const DEFAULT_FAQS = require("../defaults/faqCollections");
const DEFAULT_SEO = require("../defaults/pageSeo");
const DEFAULT_HOMEPAGE = require("../defaults/homepageContent");
const siteContent = require("./siteContent.service");

function parseBlogDate(str) {
  if (!str) return new Date();
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

async function syncBlogs() {
  let count = 0;
  for (const b of DEFAULT_BLOGS) {
    const slug = b.slug;
    // Only seed missing posts — never overwrite published CMS blogs back to draft.
    const existing = await Blog.findOne({ slug });
    if (existing) continue;
    await Blog.create({
      slug,
      title: b.title,
      standfirst: b.standfirst,
      body: b.body || "",
      category: b.category,
      tags: b.tags || [],
      relatedRoute: b.relatedRoute || "",
      status: "draft",
      publishedAt: b.publishedAt || parseBlogDate(b.date),
      author: "Nanak Migration Group",
      seoTitle: String(b.title || "").replace(/^\[DRAFT\]\s*/i, ""),
      seoDescription: b.standfirst,
    });
    count++;
  }
  return count;
}

async function syncFaqs() {
  let count = 0;
  for (const col of DEFAULT_FAQS) {
    await FaqCollection.findOneAndUpdate(
      { pageKey: col.pageKey },
      col,
      { upsert: true, new: true }
    );
    count++;
  }
  return count;
}

/**
 * Seed missing SEO rows only. Never overwrite Runway-edited titles/descriptions —
 * a prior blind upsert wiped approved meta on 41 pages.
 */
async function syncSeo() {
  let count = 0;
  for (const [routeKey, meta] of Object.entries(DEFAULT_SEO)) {
    const existing = await PageSeo.findOne({ routeKey });
    if (existing) continue;
    await PageSeo.create({ routeKey, ...meta, ogTitle: meta.title, ogDescription: meta.metaDescription });
    count++;
  }
  return count;
}

/**
 * Force-restore title / description / keywords / og* from code defaults.
 * Preserves CMS body / h1 / heroImage. Use after a bad "Sync from website".
 */
async function restoreSeoFromDefaults() {
  let count = 0;
  for (const [routeKey, meta] of Object.entries(DEFAULT_SEO)) {
    await PageSeo.findOneAndUpdate(
      { routeKey },
      {
        $set: {
          title: meta.title,
          metaDescription: meta.metaDescription,
          primaryKeyword: meta.primaryKeyword || "",
          keywords: meta.keywords || "",
          ogTitle: meta.title,
          ogDescription: meta.metaDescription,
        },
        $setOnInsert: {
          routeKey,
          h1: meta.h1 || "",
          body: meta.body || "",
          heroImage: meta.heroImage || "",
        },
      },
      { upsert: true, new: true }
    );
    count++;
  }
  return count;
}

async function syncHomepage() {
  const existing = await SiteContent.findOne({ key: "homepage" });
  if (!existing) {
    await SiteContent.create(DEFAULT_HOMEPAGE);
    return "created";
  }
  const faqItems = DEFAULT_FAQS.find((f) => f.pageKey === "homepage")?.items || DEFAULT_HOMEPAGE.faq.items;
  existing.faq = { title: "Frequently Asked Questions", items: faqItems };
  existing.stats = [
    { value: "Free", label: "Initial assessment" },
    { value: "3 languages", label: "English, Punjabi & Hindi" },
    { value: "24 hrs", label: "Average response time" },
    { value: "14 yrs", label: "Industry experience" },
  ];
  await existing.save();
  return "updated";
}

async function syncAll({ restoreSeo = false } = {}) {
  const [blogs, faqs, seoPages, homepage] = await Promise.all([
    syncBlogs(),
    syncFaqs(),
    restoreSeo ? restoreSeoFromDefaults() : syncSeo(),
    syncHomepage(),
  ]);
  return { blogs, faqs, seoPages, homepage, seoMode: restoreSeo ? "restored" : "seed-missing" };
}

module.exports = {
  syncAll,
  syncBlogs,
  syncFaqs,
  syncSeo,
  restoreSeoFromDefaults,
  syncHomepage,
};
