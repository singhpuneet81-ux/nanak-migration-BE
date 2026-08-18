const { captureIntake } = require("../services/intake.service");

exports.create = async (req, res) => {
  const result = await captureIntake(req.body, req.headers);
  const status = result.skipped ? 200 : result.created ? 201 : 200;
  res.status(status).json({ success: true, data: result });
};
