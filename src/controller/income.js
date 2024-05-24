const Income = require("../model/income");
const MonthlySummary = require('../model/MonthlySummary');
const mongoose = require('mongoose')

const addIncome = async (req, res) => {
  try {
    let date = Date.now()
    const { userId, amount, source  } = req.body;

        // checking if user id is a valid id
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    // Log the received date
    console.log("Received date:", date);
    
    const incomeDate = new Date(date);
    
    // Log the parsed date
    console.log("Parsed date:", incomeDate);
    
    if (isNaN(incomeDate.getTime())) {
      throw new Error('Invalid date format');
    }

    const newIncome = new Income({
      userId: new mongoose.Types.ObjectId(userId),
      amount,
      source,
      date: incomeDate
    });
    await newIncome.save();

    const year = incomeDate.getFullYear();
    const month = incomeDate.getMonth() + 1;

    // Log year and month
    console.log("Year:", year, "Month:", month);

    const totalIncome = await Income.calculateMonthlyTotal(userId, year, month);
    
    const summary = await MonthlySummary.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId), year, month },
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
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const incomes = await Income.find({ userId });
    res.status(200).json(incomes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addIncome, getIncomes };
