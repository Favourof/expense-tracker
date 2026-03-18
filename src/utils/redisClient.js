const { createClient } = require("redis");
const env = require("../../config/env");

let client;

const getRedisClient = async () => {
  if (client && client.isOpen) return client;

  if (!env.REDIS_URL) {
    throw new Error("REDIS_URL is not set");
  }

  client = createClient({ url: env.REDIS_URL });
  client.on("error", (err) => {
    console.error("Redis Client Error", err);
  });

  await client.connect();
  return client;
};

module.exports = { getRedisClient };
