const SiteContent = require("../models/SiteContent");
const DEFAULTS = require("../defaults/homepageContent");

async function getPublishedHomepage() {
  let doc = await SiteContent.findOne({ key: "homepage", published: true }).lean();
  if (!doc) {
    doc = await SiteContent.findOneAndUpdate(
      { key: "homepage" },
      { $setOnInsert: DEFAULTS },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
  }
  const { _id, __v, createdAt, updatedAt, ...rest } = doc;
  return rest;
}

async function getHomepageForAdmin() {
  let doc = await SiteContent.findOne({ key: "homepage" }).lean();
  if (!doc) {
    doc = await SiteContent.findOneAndUpdate(
      { key: "homepage" },
      { $setOnInsert: DEFAULTS },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
  }
  return doc;
}

async function updateHomepage(payload) {
  const allowed = [
    "hero",
    "startingPoints",
    "visaCategories",
    "stats",
    "process",
    "difference",
    "news",
    "founderCta",
    "offices",
    "faq",
    "newsletter",
    "trustBar",
    "published",
  ];
  const patch = {};
  for (const k of allowed) {
    if (payload[k] !== undefined) patch[k] = payload[k];
  }
  const doc = await SiteContent.findOneAndUpdate(
    { key: "homepage" },
    { $set: patch, $setOnInsert: { key: "homepage" } },
    { upsert: true, new: true }
  ).lean();
  return doc;
}

module.exports = { getPublishedHomepage, getHomepageForAdmin, updateHomepage, DEFAULTS };
