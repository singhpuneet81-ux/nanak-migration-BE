const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ["confirm", "r24", "r1h", "follow"], required: true },
    due: { type: Date, required: true },
    sent: { type: Date, default: null },
    body: { type: String, default: "" },
  },
  { _id: true }
);

const oafSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ["pending", "optional", "completed"], default: "pending" },
    data: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", index: true },
    name: { type: String, required: true },
    email: { type: String, trim: true, lowercase: true },
    mobile: { type: String, default: "" },
    type: { type: String, default: "pr" },
    office: { type: String, default: "Truganina" },
    mode: { type: String, enum: ["Video", "Phone"], default: "Video" },
    at: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["confirmed", "completed", "no-show", "cancelled"],
      default: "confirmed",
      index: true,
    },
    vevo: { type: Boolean, default: true },
    topic: { type: String, default: "" },
    heard: { type: String, default: "" },
    oaf: { type: oafSchema, default: () => ({ status: "pending", data: null }) },
    msgs: [messageSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
