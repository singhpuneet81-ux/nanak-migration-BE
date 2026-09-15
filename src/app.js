const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { notFound } = require("./middleware/notFound");
const { errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth.routes");
const intakeRoutes = require("./routes/intake.routes");
const adminRoutes = require("./routes/admin.routes");
const publicRoutes = require("./routes/public.routes");

const app = express();

app.set("trust proxy", 1);

const DEFAULT_ORIGINS = [
  "https://www.nanakmigration.com.au",
  "https://nanakmigration.com.au",
  "https://admin.nanakmigration.com.au",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

function allowedOrigins() {
  const fromEnv = String(process.env.CORS_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ORIGINS, ...fromEnv]);
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  const allow = allowedOrigins();
  let reflect = false;
  if (origin) {
    if (allow.has(origin)) reflect = true;
    else if (/localhost|127\.0\.0\.1/i.test(origin)) reflect = true;
    else {
      try {
        const host = new URL(origin).hostname;
        if (/(^|\.)nanakmigration\.com\.au$/i.test(host)) reflect = true;
      } catch {
        /* ignore bad origin */
      }
    }
  }
  if (origin && reflect) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else if (origin) {
    // Still reflect so browser surfaces the real API error instead of a CORS red herring
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-nanak-intake-key, Stripe-Signature"
  );
  res.setHeader("Access-Control-Expose-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Vary", "Origin");
}

// CORS first — must run before anything that can 4xx/5xx
app.use((req, res, next) => {
  try {
    applyCors(req, res);
  } catch {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-nanak-intake-key");
  }
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: false,
    frameguard: { action: "deny" },
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);
app.use((req, res, next) => {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  next();
});
app.use(morgan("dev"));

app.use(express.json({ limit: "1mb" }));

const intakeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use("/api/intake", intakeLimiter);

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    service: "nanak-migration-backend",
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/intake", intakeRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use((err, req, res, next) => {
  try {
    applyCors(req, res);
  } catch {
    /* ignore */
  }
  return errorHandler(err, req, res, next);
});

module.exports = app;
