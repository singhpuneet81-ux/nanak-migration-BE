const mongoose = require("mongoose");

const runwaySettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "default", unique: true },
    intakeApiKey: { type: String, default: "" },
    slaMins: {
      hot: { type: Number, default: 30 },
      warm: { type: Number, default: 240 },
      cool: { type: Number, default: 1440 },
    },
    rmaName: { type: String, default: "Navpreet Aulakh" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RunwaySettings", runwaySettingsSchema);
