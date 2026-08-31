const mongoose = require("mongoose");

const faqItemSchema = new mongoose.Schema(
  {
    q: { type: String, required: true },
    a: { type: String, required: true },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const faqCollectionSchema = new mongoose.Schema(
  {
    pageKey: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, default: "Frequently asked questions" },
    items: [faqItemSchema],
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FaqCollection", faqCollectionSchema);
