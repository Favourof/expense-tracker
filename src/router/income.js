const express = require("express");
const { addIncome, getIncomes, updateIncome, deleteIncome } = require("../controller/income");
const {
  getMonthlySummary,
  getWeeklySummariesForMonth,
  calculateIncomeInsights,
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
router.get("/summary/:year/:month/insights", verifyToken, async (req, res) => {
  try {
    const { year, month } = req.params;
    const insights = await calculateIncomeInsights(
      req.user,
      parseInt(year, 10),
      parseInt(month, 10)
    );
    res.status(200).json(insights);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.patch("/:id", verifyToken, validateIncomeUpdate, updateIncome);
router.delete("/:id", verifyToken, deleteIncome);

module.exports = router;
