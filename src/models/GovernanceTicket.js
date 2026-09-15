const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    at: { type: Date, default: Date.now },
    by: { type: String, default: "system" },
  },
  { _id: true }
);

const governanceTicketSchema = new mongoose.Schema(
  {
    ref: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    mobile: { type: String, default: "", trim: true },
    category: {
      type: String,
      enum: ["complaint", "feedback", "service-quality", "billing", "privacy", "other"],
      default: "complaint",
      index: true,
    },
    subject: { type: String, required: true, trim: true },
    details: { type: String, required: true, trim: true },
    relatedRef: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["new", "in_progress", "resolved", "closed"],
      default: "new",
      index: true,
    },
    page: { type: String, default: "governance" },
    notes: [noteSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("GovernanceTicket", governanceTicketSchema);
