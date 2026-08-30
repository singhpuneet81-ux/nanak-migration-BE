const mongoose = require("mongoose");

const cardSchema = new mongoose.Schema(
  {
    id: String,
    title: String,
    description: String,
    linkLabel: String,
    href: String,
    icon: String,
    timeframe: String,
    youGet: String,
  },
  { _id: false }
);

const siteContentSchema = new mongoose.Schema(
  {
    key: { type: String, default: "homepage", unique: true },
    hero: {
      badge: String,
      headline: String,
      headlineAccent: String,
      subtext: String,
      primaryCta: String,
      primaryCtaHref: String,
      secondaryCta: String,
      secondaryCtaHref: String,
    },
    startingPoints: {
      eyebrow: String,
      title: String,
      items: [cardSchema],
    },
    visaCategories: {
      eyebrow: String,
      title: String,
      items: [cardSchema],
    },
    stats: [{ value: String, label: String }],
    process: {
      eyebrow: String,
      title: String,
      titleAccent: String,
      subtext: String,
      steps: [cardSchema],
    },
    difference: {
      title: String,
      subtext: String,
      cta: String,
      ctaHref: String,
    },
    news: {
      eyebrow: String,
      title: String,
      featured: {
        slug: String,
        title: String,
        excerpt: String,
        date: String,
        category: String,
      },
      items: [
        {
          slug: String,
          title: String,
          excerpt: String,
          date: String,
          category: String,
        },
      ],
    },
    founderCta: {
      title: String,
      subtext: String,
      cta: String,
      ctaHref: String,
    },
    offices: {
      eyebrow: String,
      title: String,
      titleAccent: String,
      items: [{ city: String, address: String, phone: String }],
    },
    faq: {
      title: String,
      items: [{ q: String, a: String }],
    },
    newsletter: {
      eyebrow: String,
      title: String,
      subtext: String,
      buttonLabel: String,
    },
    trustBar: [String],
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SiteContent", siteContentSchema);
