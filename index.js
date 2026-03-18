const express = require("express");
const app = express();
const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const cookieParser = require("cookie-parser");
const requestLogger = require("./src/middleWare/requestLogger");
const logger = require("./src/utils/logger");
const env = require("./config/env");
const { getRedisClient } = require("./src/utils/redisClient");
const cors = require("cors");
const sanitize = require("./src/middleWare/sanitize");
const mongoose = require("mongoose");
const authRoute = require("./src/router/Auth");
const incomeRoute = require("./src/router/income");
const errorHandler = require("./src/middleWare/errorHandler");
const expenseRoute = require("./src/router/expense");
const categoryRoute = require("./src/router/category");
const summaryRoute = require("./src/router/summary");

app.set("trust proxy", 1);
app.use(
  cors({
    origin: env.isDev ? true : env.CLIENT_ORIGIN.split(",").filter(Boolean),
    credentials: true,
  }),
);
app.options("*", cors());
// app.use(
//   rateLimit({
//     windowMs: 15 * 60 * 1000,
//     max: 100,
//     standardHeaders: true,
//     legacyHeaders: false,
//     keyGenerator: (req) => `${req.ip}|${req.get("user-agent") || "unknown"}`,
//     store: new RedisStore({
//       sendCommand: (...args) =>
//         getRedisClient().then((client) => client.sendCommand(args)),
//     }),
//   }),
// );
app.use(requestLogger);
app.use(cookieParser());
app.use(express.json());
app.use(sanitize());

const mongoApiConnet = env.mongoURL;
let port = env.port;

app.use("/api/v1", authRoute);
app.use("/api/v1/income", incomeRoute);
app.use("/api/v1/expense", expenseRoute);
app.use("/api/v1/categories", categoryRoute);
app.use("/api/v1/summary", summaryRoute);
app.get("/", (req, res) => res.send("welcome to expense tracker"));

app.use(errorHandler);

// console.log(mongoApiConnet)

const start = async () => {
  try {
    const conn = await mongoose.connect(mongoApiConnet);
    // console.log(conn)
    logger.info("connected_to_db");
    if (conn) {
      app.listen(port, () => {
        logger.info("listening_on_port", { port });
      });
    }
  } catch (error) {
    logger.error("startup_error", {
      message: error.message,
      stack: error.stack,
    });
  }
};

start();
