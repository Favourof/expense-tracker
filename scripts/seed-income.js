const mongoose = require("mongoose");
const env = require("../config/env");
const Transaction = require("../src/model/Transaction");

const parseArgs = () => {
  const args = process.argv.slice(2);
  const out = {};
  args.forEach((arg) => {
    const [key, value] = arg.split("=");
    if (key && value !== undefined) out[key] = value;
  });
  return out;
};

const run = async () => {
  const args = parseArgs();
  const userId = args.userId || process.env.SEED_USER_ID;
  const count = Math.max(parseInt(args.count || "20", 10), 1);

  if (!userId) {
    console.error("Missing userId. Use userId=<id> or set SEED_USER_ID.");
    process.exit(1);
  }

  await mongoose.connect(env.mongoURL);

  const now = new Date();
  const docs = Array.from({ length: count }).map((_, i) => {
    const daysAgo = Math.floor(Math.random() * 60);
    const timestamp = new Date(now);
    timestamp.setDate(now.getDate() - daysAgo);

    return {
      userId,
      type: "income",
      amount: Math.floor(1000 + Math.random() * 50000),
      timestamp,
      source: "manual",
      note: "seed",
    };
  });

  await Transaction.insertMany(docs);
  console.log(`Seeded ${count} income transactions for user ${userId}.`);

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
