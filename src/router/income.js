const express = require("express");
const { addIncome, getIncomes, updateIncome, deleteIncome } = require("../controller/income");
const {
  getMonthlySummary,
  getWeeklySummariesForMonth,
} = require("../controller/summaryController");
const { validateIncome, validateIncomeUpdate } = require("../validation/incomeValidator");
const { verifyToken } = require("../middleWare/verifyToken");

const router = express.Router();

router.post("/addincome", verifyToken, validateIncome, addIncome);
router.get("/", verifyToken, getIncomes);
router.get("/summary/:year/:month", verifyToken, getMonthlySummary);
router.get(
  "/summary/:year/:month/weekly",
  verifyToken,
  getWeeklySummariesForMonth,
);
router.patch("/:id", verifyToken, validateIncomeUpdate, updateIncome);
router.delete("/:id", verifyToken, deleteIncome);

module.exports = router;
