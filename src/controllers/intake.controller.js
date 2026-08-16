const { captureIntake } = require("../services/intake.service");

exports.create = async (req, res) => {
  const result = await captureIntake(req.body, req.headers);
  res.status(result.created ? 201 : 200).json({ success: true, data: result });
};
