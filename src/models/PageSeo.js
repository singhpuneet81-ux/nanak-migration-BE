const mongoose = require("mongoose");

const pageSeoSchema = new mongoose.Schema(
  {
    routeKey: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    primaryKeyword: { type: String, default: "" },
    canonicalUrl: { type: String, default: "" },
    ogTitle: { type: String, default: "" },
    ogDescription: { type: String, default: "" },
    ogImage: { type: String, default: "" },
    robotsIndex: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PageSeo", pageSeoSchema);
