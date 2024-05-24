const MonthlySummary = require('../model/MonthlySummary');
const Income = require('../model/income');
const mongoose = require('mongoose');



const calculateWeeklySummaries = async (userId, year, month) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  
  const weeklySummaries = await Income.calculateWeeklyTotal(userId, year, month);
  
  return weeklySummaries.map(week => ({
    week: week._id,
    totalIncome: week.totalIncome
  }));
};


const getWeeklySummariesForMonth = async (req, res) => {
  try {
    const { userId, year, month } = req.params;

    // Calculate weekly summaries for the month
  const weeklySummaries = await calculateWeeklySummaries(userId, parseInt(year), parseInt(month));

    res.status(200).json(weeklySummaries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMonthlySummary = async (req, res) => {
  try {
    const { userId, year, month } = req.params;
    const summary = await MonthlySummary.findOne({ userId, year, month });
    if (!summary) {
      return res.status(404).json({ message: 'Summary not found' });
    }
    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getMonthlySummary, getWeeklySummariesForMonth  };
