require("dotenv").config();
const app = require("./app");
const { connectDB } = require("./config/db");

const PORT = process.env.PORT || 5001;

async function bootstrap() {
  await connectDB();
  try {
    const { startRunwayWorker } = require("./workers/runway.worker");
    startRunwayWorker();
  } catch (e) {
    console.error("[worker] boot error:", e.message);
  }
  app.listen(PORT, () => {
    console.log(`Nanak Migration API running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
