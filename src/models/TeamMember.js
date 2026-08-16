const mongoose = require("mongoose");

const teamMemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    role: { type: String, default: "" },
    office: { type: String, default: "" },
    capacity: { type: Number, default: 12 },
    scope: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TeamMember", teamMemberSchema);
