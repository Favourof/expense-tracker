const Income = require("../model/income");
const MonthlySummary = require('../model/MonthlySummary');

const addIncome = async (req, res) => {
    try {
        const { userId, amount, source, date } = req.body;
        const newIncome = new Income({ userId, amount, source, date });
        await newIncome.save();
    
        const incomeDate = new Date(date);
        const year = incomeDate.getFullYear();
        const month = incomeDate.getMonth() + 1;
    
        const totalIncome = await Income.calculateMonthlyTotal(userId, year, month);
        
        const summary = await MonthlySummary.findOneAndUpdate(
          { userId, year, month },
          { totalIncome },
          { upsert: true, new: true }
        );
    
        res.status(201).json({ income: newIncome, summary });
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    };
const getIncomes = async (req, res) => {
  try {
    const { userId } = req.params;
    const incomes = await Income.find({ userId });
    res.status(200).json(incomes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addIncome, getIncomes, };
