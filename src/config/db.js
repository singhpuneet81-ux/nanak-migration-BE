const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is missing in .env");
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, {
    autoIndex: true,
    serverSelectionTimeoutMS: 15000,
    heartbeatFrequencyMS: 10000,
  });
  console.log("MongoDB connected");
}

module.exports = { connectDB };
