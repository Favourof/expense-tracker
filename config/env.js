require("dotenv").config();

const NODE_ENV = process.env.NODE_ENV || "development";
const isProd = NODE_ENV === "production";
const isDev = !isProd;

const env = {
  mongoURL: process.env.mongoURL,
  port: process.env.port || 4000,

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_LIFETIME: process.env.JWT_LIFETIME || "15m",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_REFRESH_LIFETIME: process.env.JWT_REFRESH_LIFETIME || "7d",

  REDIS_URL: process.env.REDIS_URL,

  cloud_name: process.env.cloud_name,
  cloud_api_key: process.env.cloud_api_key,
  cloud_api_secret: process.env.cloud_api_secret,

  usermail: process.env.usermail,
  passkey: process.env.passkey,

  LOG_LEVEL: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
  NODE_ENV,
  isProd,
  isDev,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || "",
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || "",
  COOKIE_SAMESITE: process.env.COOKIE_SAMESITE || (isProd ? "none" : "lax"),
  COOKIE_SECURE: process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === "true"
    : isProd,
  BASE_URL: process.env.BASE_URL,
  TEST_USER_EMAIL: process.env.TEST_USER_EMAIL,
  TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD,
};

const requiredInProd = [
  "mongoURL",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "REDIS_URL",
  "usermail",
  "passkey",
  "cloud_name",
  "cloud_api_key",
  "cloud_api_secret",
];
const missingInProd = requiredInProd.filter((key) => !env[key]);

if (env.isProd && missingInProd.length > 0) {
  throw new Error(
    `Missing required env vars in production: ${missingInProd.join(", ")}`
  );
}

if (env.isProd && !env.CLIENT_ORIGIN) {
  console.warn("CLIENT_ORIGIN is empty in production; CORS may block requests.");
}

module.exports = env;
