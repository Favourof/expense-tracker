const Expense = require('../model/expense');
const mongoose = require('mongoose');

const addExpense = async (req, res) => {
    let date = Date.now()
  try {
    const { userId, categories } = req.body;
    const expenseDate = new Date(date);
    if (isNaN(expenseDate.getTime())) {
      throw new Error('Invalid date format');
    }
    const newExpense = new Expense({
      userId: new mongoose.Types.ObjectId(userId),
      categories,
      date: expenseDate,
    });
    await newExpense.save();
    res.status(201).json({ expense: newExpense });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getExpensesForPeriod = async (req, res, start, end) => {
  const { userId } = req.params;
  try {
    const expenses = await Expense.find({ userId: new mongoose.Types.ObjectId(userId), date: { $gte: start, $lte: end } });
    res.status(200).json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getDailyExpenses = async (req, res) => {
  const { year, month, day } = req.params;
  const start = new Date(year, month - 1, day);
  const end = new Date(year, month - 1, day, 23, 59, 59);
  await getExpensesForPeriod(req, res, start, end);
};

const getWeeklyExpenses = async (req, res) => {
  const { year, month, week } = req.params;
  const start = new Date(year, month - 1, (week - 1) * 7 + 1);
  const end = new Date(year, month - 1, week * 7, 23, 59, 59);
  await getExpensesForPeriod(req, res, start, end);
};

const getMonthlyExpenses = async (req, res) => {
  const { year, month } = req.params;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  await getExpensesForPeriod(req, res, start, end);
};

module.exports = {
  addExpense,
  getDailyExpenses,
  getWeeklyExpenses,
  getMonthlyExpenses,
};
