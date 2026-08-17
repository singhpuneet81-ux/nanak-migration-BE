const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { notFound } = require("./middleware/notFound");
const { errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth.routes");
const intakeRoutes = require("./routes/intake.routes");
const adminRoutes = require("./routes/admin.routes");

const app = express();

app.set("trust proxy", 1);

// CORS first — reflect any frontend origin (Vercel, custom domain, localhost)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-nanak-intake-key"
  );
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: false,
  })
);
app.use(morgan("dev"));

app.use(express.json({ limit: "1mb" }));

const intakeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use("/api/intake", intakeLimiter);

app.get("/api/health", (_req, res) => {
  res.json({ success: true, service: "nanak-migration-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/intake", intakeRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
