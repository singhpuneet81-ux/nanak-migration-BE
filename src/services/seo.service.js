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

/** Pre-overhaul titles from the Sep 2026 Meta restore audit (Column B). */
const STALE_SYNCED_TITLES = new Set([
  "Nanak Migration Group | Australian Migration Experts",
  "186 Visa Occupations List | Nanak Migration Group",
  "186 Visa Skill Requirements | Nanak Migration Group",
  "482 to PR Pathway - 186 TRT Stream | Nanak Migration Group",
  "482 to PR Pathway — 186 TRT Stream | Nanak Migration Group",
  "About Nanak Migration Group | Registered Migration Agents",
  "ART Review - Administrative Review Tribunal | Nanak",
  "ART Review — Administrative Review Tribunal | Nanak",
  "Australian Citizenship by Conferral | Nanak Migration Group",
  "Migration Blog - Policy & Visa News | Nanak Migration Group",
  "Migration Blog — Policy & Visa News | Nanak Migration Group",
  "Book a Consultation | Nanak Migration Group",
  "Bridging Visas Explained | Nanak Migration Group",
  "Visa Document Checklists | Nanak Migration Group",
  "Core Skills Occupation List (CSOL) | Nanak Migration Group",
  "Employer Nomination Scheme (186) | Nanak Migration Group",
  "Employer Sponsored Visas | Nanak Migration Group",
  "English Requirements for Australian Visas | Nanak Migration",
  "Genuine Student Requirement (GSR) | Nanak Migration Group",
  "Visa Guides - 30 Australian Visa Topics | Nanak Migration",
  "Visa Guides — 30 Australian Visa Topics | Nanak Migration",
  "Parent Visas Australia - All Pathways | Nanak Migration Group",
  "Parent Visas Australia — All Pathways | Nanak Migration Group",
  "Partner & Family Visas Australia | Nanak Migration Group",
  "Partner Visa Offshore (309/100) | Nanak Migration Group",
  "Partner Visa Onshore (820/801) | Nanak Migration Group",
  "Partner Visa Evidence Guide | Nanak Migration Group",
  "Australian Points Test Explained | Nanak Migration Group",
  "Prospective Marriage Visa (300) | Nanak Migration Group",
  "Visa Guides, Blogs & Checklists | Nanak Migration Group",
  "Skilled Independent Visa (189) | Nanak Migration Group",
  "Skilled Migration to Australia | Nanak Migration Group",
  "Skilled Nominated Visa (190) | Nanak Migration Group",
  "Skilled Work Regional Visa (491) | Nanak Migration Group",
  "Skills Assessment for Australian Visas | Nanak Migration",
  "Skills in Demand Visa (482) | Nanak Migration Group",
  "Standard Business Sponsorship (SBS) | Nanak Migration Group",
  "State Nomination Requirements | Nanak Migration Group",
  "Student to PR Pathway in Australia | Nanak Migration Group",
  "Student Visa (Subclass 500) | Nanak Migration Group",
  "Australian Student Visas | Nanak Migration Group",
  "Temporary Graduate Visa (485) | Nanak Migration Group",
  "Migration Tools - Free Visa Calculators | Nanak Migration",
  "Migration Tools — Free Visa Calculators | Nanak Migration",
  "Visa Refusal & Review Options | Nanak Migration Group",
  "Contact Nanak Migration Group | Truganina, Geelong, Cranbourne, Canning Vale, Craigieburn",
]);

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

async function healStaleSyncedTitles() {
  const { restoreSeoFromDefaults } = require("./contentSync.service");
  const stale = await PageSeo.countDocuments({ title: { $in: [...STALE_SYNCED_TITLES] } });
  if (stale > 0) {
    await restoreSeoFromDefaults();
  }
}

/** Seed missing route keys from defaults (safe for existing DBs). */
async function ensureDefaults() {
  const existing = await PageSeo.find({}, { routeKey: 1 }).lean();
  const have = new Set(existing.map((e) => e.routeKey));
  const missing = Object.entries(DEFAULT_SEO)
    .filter(([routeKey]) => !have.has(routeKey))
    .map(([routeKey, meta]) => ({
      routeKey,
      ...meta,
      ogTitle: meta.title,
      ogDescription: meta.metaDescription,
    }));
  if (missing.length) await PageSeo.insertMany(missing);
  await healStaleSyncedTitles();
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
    page = await PageSeo.create({
      routeKey: key,
      ...DEFAULT_SEO[key],
      ogTitle: DEFAULT_SEO[key].title,
      ogDescription: DEFAULT_SEO[key].metaDescription,
    });
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
