const mongoose = require("mongoose");

const deadlineSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    due: { type: Date, required: true },
    done: { type: Boolean, default: false },
  },
  { _id: true }
);

const matterSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", default: null, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null, index: true },
    type: { type: String, default: "Skilled Migration", index: true },
    visaCategory: { type: String, default: "" },
    stage: {
      type: String,
      enum: ["intake", "advice", "engaged", "docs", "review", "lodgement", "post-lodgement", "closed"],
      default: "intake",
      index: true,
    },
    status: { type: String, enum: ["open", "on-hold", "lodged", "approved", "closed"], default: "open", index: true },
    assignedTo: { type: String, default: "", index: true },
    office: { type: String, default: "" },
    feeStatus: { type: String, enum: ["unpaid", "part-paid", "paid"], default: "unpaid", index: true },
    lodgementStatus: { type: String, enum: ["not-ready", "ready", "lodged", "decision"], default: "not-ready", index: true },
    nextAction: { type: String, default: "" },
    nextActionAt: { type: Date, default: null, index: true },
    documentsOutstanding: { type: Number, default: 0 },
    riskLevel: { type: String, enum: ["low", "medium", "high"], default: "low", index: true },
    notes: [{ text: String, at: { type: Date, default: Date.now } }],
    deadlines: [deadlineSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Matter", matterSchema);
