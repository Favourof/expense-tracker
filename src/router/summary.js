const express = require("express");
const { verifyToken } = require("../middleWare/verifyToken");
const { getWeeklySummaryCombined } = require("../controller/summaryController");

const router = express.Router();

router.get("/:year/:month/weekly", verifyToken, getWeeklySummaryCombined);

module.exports = router;
