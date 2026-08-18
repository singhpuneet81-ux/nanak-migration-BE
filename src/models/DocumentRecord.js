const mongoose = require("mongoose");

const documentRecordSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    matterId: { type: mongoose.Schema.Types.ObjectId, ref: "Matter", default: null, index: true },
    category: { type: String, default: "Identity", index: true },
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: ["required", "requested", "received", "verified", "expired"], default: "required", index: true },
    requestedAt: { type: Date, default: null },
    receivedAt: { type: Date, default: null },
    expiryAt: { type: Date, default: null, index: true },
    version: { type: Number, default: 1 },
    source: { type: String, enum: ["client", "agent", "generated"], default: "client" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DocumentRecord", documentRecordSchema);
