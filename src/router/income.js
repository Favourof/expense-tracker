const express = require("express")
const { addIncome, getIncomes } = require("../controller/income")
const { getMonthlySummary } = require('../controller/summaryController');

const router = express.Router()

router.post('/income', addIncome)
router.get('/:userId', getIncomes);
router.get('/summary/:userId/:year/:month', getMonthlySummary);

module.exports = router