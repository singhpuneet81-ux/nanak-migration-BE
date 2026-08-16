function errorHandler(err, req, res, _next) {
  const status = err.statusCode || err.status || 500;
  const message = err.message || "Internal Server Error";
  if (err.name === "ValidationError") {
    return res.status(400).json({ success: false, message, details: err.errors });
  }
  if (err.code === 11000) {
    return res.status(400).json({ success: false, message: "Duplicate key error" });
  }
  console.error("[error]", err);
  res.status(status).json({ success: false, message });
}

module.exports = { errorHandler };
