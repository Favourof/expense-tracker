const logger = require("../utils/logger");
const env = require("../../config/env");

const errorHandler = (err, req, res, next) => {
  logger.error("request_error", {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  if (res.headersSent) {
    return next(err);
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({
      message: err.message,
      details: err.errors,
      ...(env.isDev ? { stack: err.stack } : {}),
    });
  }

  if (err.name === "CastError" && err.kind === "ObjectId") {
    return res.status(400).json({ message: "Invalid ID format" });
  }

  res.status(500).json({
    message: "Internal Server Error",
    ...(env.isDev ? { stack: err.stack } : {}),
  });
};

module.exports = errorHandler;
  
