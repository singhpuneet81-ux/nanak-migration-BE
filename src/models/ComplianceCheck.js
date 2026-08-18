const mongoose = require("mongoose");

const complianceCheckSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true, index: true },
    matterId: { type: mongoose.Schema.Types.ObjectId, ref: "Matter", default: null, index: true },
    kycStatus: { type: String, enum: ["pending", "in-review", "verified"], default: "pending", index: true },
    sourceOfFundsStatus: { type: String, enum: ["pending", "review", "cleared"], default: "pending", index: true },
    sanctionsStatus: { type: String, enum: ["pending", "clear", "manual-review"], default: "pending", index: true },
    pepStatus: { type: String, enum: ["clear", "watch"], default: "clear" },
    riskRating: { type: String, enum: ["low", "medium", "high"], default: "low", index: true },
    overallStatus: { type: String, enum: ["pending", "approved", "escalated"], default: "pending", index: true },
    reviewer: { type: String, default: "" },
    reviewedAt: { type: Date, default: null },
    notes: [{ text: String, at: { type: Date, default: Date.now } }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("ComplianceCheck", complianceCheckSchema);
