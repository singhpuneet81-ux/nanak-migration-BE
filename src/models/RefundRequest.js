const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    at: { type: Date, default: Date.now },
    by: { type: String, default: "system" },
  },
  { _id: true }
);

const refundRequestSchema = new mongoose.Schema(
  {
    ref: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    mobile: { type: String, default: "", trim: true },
    bookingRef: { type: String, default: "", trim: true },
    invoiceRef: { type: String, default: "", trim: true },
    amountAud: { type: Number, default: 0 },
    reason: { type: String, required: true, trim: true },
    paymentMethod: {
      type: String,
      enum: ["stripe", "bank", "cash", "other", "unknown"],
      default: "unknown",
    },
    status: {
      type: String,
      enum: ["new", "reviewing", "approved", "rejected", "refunded"],
      default: "new",
      index: true,
    },
    page: { type: String, default: "refund-request" },
    notes: [noteSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("RefundRequest", refundRequestSchema);
