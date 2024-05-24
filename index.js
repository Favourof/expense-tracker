require("dotenv").config();
const express = require("express");
const app = express();
const morgan = require("morgan");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoute = require("./src/router/Auth");
const incomeRoute = require("./src/router/income")
const errorHandler = require('./src/middleWare/errorHandler');
const expenseRoute = require('./src/router/expense')


app.use(morgan("dev"));
app.use(express.json());
app.use(cors());

const mongoApiConnet = process.env.mongoURL;
let port = process.env.port;

app.use('/api/v1', authRoute);
app.use('/api/v1/income', incomeRoute)
app.use('/api/v1/expense', expenseRoute)

app.use(errorHandler);

// console.log(mongoApiConnet)

const start = async () => {
  try {
    const conn = await mongoose.connect(mongoApiConnet);
    // console.log(conn)
    console.log("conneted to db");
    if (conn) {
      app.listen(port, () => {
        console.log("listening on port" + port);
      });
    }
  } catch (error) {
    console.log(error);
  }
};

start();
