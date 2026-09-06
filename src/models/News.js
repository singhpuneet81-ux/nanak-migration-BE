const mongoose = require("mongoose");

const NEWS_CATEGORIES = [
  "Policy changes",
  "Occupation lists",
  "Fees & thresholds",
  "Case outcomes",
  "Firm news",
  "General",
];

const newsSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    standfirst: { type: String, default: "" },
    body: { type: String, default: "" },
    category: { type: String, default: "Policy changes" },
    tags: [{ type: String }],
    relatedRoute: { type: String, default: "" },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    publishedAt: { type: Date },
    author: { type: String, default: "Nanak Migration Group" },
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" },
    ogImage: { type: String, default: "" },
    featured: { type: Boolean, default: false },
    readTime: { type: String, default: "3 min read" },
  },
  { timestamps: true }
);

newsSchema.index({ status: 1, publishedAt: -1 });
newsSchema.index({ category: 1 });
newsSchema.index({ featured: 1, status: 1 });

module.exports = mongoose.model("News", newsSchema);
module.exports.NEWS_CATEGORIES = NEWS_CATEGORIES;
