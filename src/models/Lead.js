const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  { text: String, at: { type: Date, default: Date.now } },
  { _id: true }
);

const signalSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["calc", "gate", "cta", "view"], default: "view" },
    detail: String,
    at: { type: Date, default: Date.now },
  },
  { _id: true }
);

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, index: true },
    mobile: { type: String, trim: true, default: "" },
    subclass: { type: String, default: "" },
    expiry: { type: Date, default: null, index: true },
    goal: { type: String, default: "" },
    occupation: { type: String, default: "" },
    location: { type: String, default: "" },
    source: { type: String, default: "Blog", index: true },
    article: { type: String, default: "" },
    status: {
      type: String,
      enum: ["new", "engaged", "consult", "won", "lost"],
      default: "new",
      index: true,
    },
    owner: { type: String, default: "", index: true },
    contactedAt: { type: Date, default: null },
    consent: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      wa: { type: Boolean, default: false },
    },
    notes: [noteSchema],
    signals: [signalSchema],
  },
  { timestamps: true }
);

leadSchema.index({ createdAt: -1 });
leadSchema.index({ name: "text", email: "text", occupation: "text", location: "text" });

module.exports = mongoose.model("Lead", leadSchema);
