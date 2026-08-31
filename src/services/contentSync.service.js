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
    await Blog.findOneAndUpdate(
      { slug },
      {
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
        seoTitle: b.title.replace("[DRAFT] ", ""),
        seoDescription: b.standfirst,
      },
      { upsert: true, new: true }
    );
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

async function syncSeo() {
  let count = 0;
  for (const [routeKey, meta] of Object.entries(DEFAULT_SEO)) {
    await PageSeo.findOneAndUpdate({ routeKey }, { routeKey, ...meta }, { upsert: true, new: true });
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

async function syncAll() {
  const [blogs, faqs, seoPages, homepage] = await Promise.all([
    syncBlogs(),
    syncFaqs(),
    syncSeo(),
    syncHomepage(),
  ]);
  return { blogs, faqs, seoPages, homepage };
}

module.exports = { syncAll, syncBlogs, syncFaqs, syncSeo, syncHomepage };
