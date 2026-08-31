const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    standfirst: { type: String, default: "" },
    body: { type: String, default: "" },
    category: { type: String, default: "General" },
    tags: [{ type: String }],
    relatedRoute: { type: String, default: "" },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    publishedAt: { type: Date },
    author: { type: String, default: "Nanak Migration Group" },
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" },
    ogImage: { type: String, default: "" },
  },
  { timestamps: true }
);

blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ category: 1 });

module.exports = mongoose.model("Blog", blogSchema);
