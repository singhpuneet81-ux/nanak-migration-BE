const mongoose = require("mongoose");

const clientLinkSchema = new mongoose.Schema(
  {
    label: { type: String, default: "" },
    relation: { type: String, default: "" },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
  },
  { _id: false }
);

const clientSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ["person", "business"], default: "person", index: true },
    status: { type: String, enum: ["lead", "active", "inactive"], default: "active", index: true },
    name: { type: String, required: true, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true, default: "", index: true },
    mobile: { type: String, trim: true, default: "" },
    dob: { type: Date, default: null },
    occupation: { type: String, default: "" },
    location: { type: String, default: "" },
    preferredChannel: { type: String, enum: ["email", "phone", "whatsapp"], default: "email" },
    visaCurrent: { type: String, default: "" },
    visaGoal: { type: String, default: "" },
    visaExpiry: { type: Date, default: null },
    source: { type: String, default: "" },
    assignedTo: { type: String, default: "", index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", default: null, index: true },
    notes: [{ text: String, at: { type: Date, default: Date.now } }],
    tags: [{ type: String }],
    links: [clientLinkSchema],
  },
  { timestamps: true }
);

clientSchema.index({ name: "text", email: "text", occupation: "text", location: "text" });

module.exports = mongoose.model("Client", clientSchema);
