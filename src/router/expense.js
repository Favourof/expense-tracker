const express = require("express");
const {
  addExpense,
  getDailyExpenses,
  getWeeklyExpenses,
  getMonthlyExpenses,
  getAllExpenses,
  addSubcategory,
  updateExpense,
  deleteExpense,
} = require("../controller/expense");
const { verifyToken } = require("../middleWare/verifyToken");
const {
  validateAddExpense,
  validateAddSubcategory,
  validateUpdateExpense,
} = require("../validation/expenseValidator");

const router = express.Router();

router.post("/add", verifyToken, validateAddExpense, addExpense);
router.post("/subcategory/add", verifyToken, validateAddSubcategory, addSubcategory);
router.get("/all", verifyToken, getAllExpenses);
router.get("/daily/:year/:month/:day", verifyToken, getDailyExpenses);
router.get("/weekly/:year/:month/:week", verifyToken, getWeeklyExpenses);
router.get("/monthly/:year/:month", verifyToken, getMonthlyExpenses);
router.patch("/:id", verifyToken, validateUpdateExpense, updateExpense);
router.delete("/:id", verifyToken, deleteExpense);

module.exports = router;
