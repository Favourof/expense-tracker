const cloudinary = require("cloudinary").v2;
const env = require("../../config/env");

cloudinary.config({
  cloud_name: env.cloud_name,
  api_key: env.cloud_api_key,
  api_secret: env.cloud_api_secret,
});

module.exports = cloudinary;
