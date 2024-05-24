const express = require("express")
const { addIncome, getIncomes } = require("../controller/income")
const { getMonthlySummary, getWeeklySummariesForMonth } = require('../controller/summaryController');
const { validateIncome } = require('../validation/incomeValidator');

const router = express.Router()

router.post('/addincome', validateIncome, addIncome)
router.get('/:userId', getIncomes);
router.get('/summary/:userId/:year/:month', getMonthlySummary);
router.get('/summary/:userId/:year/:month/weekly', getWeeklySummariesForMonth);

module.exports = router