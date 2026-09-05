const mongoose = require("mongoose");

const pageSeoSchema = new mongoose.Schema(
  {
    routeKey: { type: String, required: true, unique: true, trim: true, lowercase: true },
    /** Browser / SERP title */
    title: { type: String, default: "" },
    /** Meta description */
    metaDescription: { type: String, default: "" },
    /** Primary focus keyword */
    primaryKeyword: { type: String, default: "" },
    /** Extra keywords (comma-separated) */
    keywords: { type: String, default: "" },
    /** On-page H1 override (optional) */
    h1: { type: String, default: "" },
    /** On-page intro / body copy (plain text or light HTML) */
    body: { type: String, default: "" },
    /** Hero / social image URL */
    heroImage: { type: String, default: "" },
    canonicalUrl: { type: String, default: "" },
    ogTitle: { type: String, default: "" },
    ogDescription: { type: String, default: "" },
    ogImage: { type: String, default: "" },
    robotsIndex: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PageSeo", pageSeoSchema);
