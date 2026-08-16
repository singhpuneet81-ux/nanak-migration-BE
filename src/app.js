const express = require("express");
const cors = require("cors");
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
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(morgan("dev"));

// Allow all origins (admin FE on Vercel / custom domains)
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-nanak-intake-key"],
  })
);
app.options("*", cors({ origin: true, credentials: true }));

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
