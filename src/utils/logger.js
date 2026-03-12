const { createLogger, format, transports } = require("winston");
const env = require("../../config/env");

const logger = createLogger({
  level: env.LOG_LEVEL || "info",
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  transports: [new transports.Console()],
});

module.exports = logger;
