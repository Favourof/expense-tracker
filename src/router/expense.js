const express = require('express');
const { addExpense, getDailyExpenses, getWeeklyExpenses, getMonthlyExpenses } = require('../controller/expense');
const router = express.Router();

router.post('/add', addExpense);
router.get('/daily/:userId/:year/:month/:day', getDailyExpenses);
router.get('/weekly/:userId/:year/:month/:week', getWeeklyExpenses);
router.get('/monthly/:userId/:year/:month', getMonthlyExpenses);

module.exports = router;
