const Expense = require('../model/expense');
const mongoose = require('mongoose');

// Add or update an expense
const addExpense = async (req, res) => {
  try {
    const { userId, categories } = req.body;
    const expenseDate = new Date();

    if (isNaN(expenseDate.getTime())) {
      throw new Error('Invalid date format');
    }

    // Find the existing expense document for the user
    let expense = await Expense.findOne({ userId: new mongoose.Types.ObjectId(userId) });

    if (expense) {
      // Expense document exists, update it with new categories
      const existingCategoryNames = expense.categories.map(cat => cat.name.toLowerCase());

      categories.forEach(newCategory => {
        if (!existingCategoryNames.includes(newCategory.name.toLowerCase())) {
          expense.categories.push(newCategory);
        } 
      });

      expense.date = expenseDate;
    } else {
      // Create a new expense document
      expense = new Expense({
        userId: new mongoose.Types.ObjectId(userId),
        categories,
        date: expenseDate,
      });
    }

    // Save the updated or new expense document
    await expense.save();

    res.status(201).json({ expense });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};



const addSubcategory = async (req, res) => {
  try {
    const { userId, categoryName, subCategory } = req.body;

    if (!userId || !categoryName || !subCategory) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const normalizedCategoryName = categoryName.toLowerCase();

    const expense = await Expense.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (!expense) {
      return res.status(404).json({ message: 'Expense document not found' });
    }

    const category = expense.categories.find(cat => cat.name.toLowerCase() === normalizedCategoryName);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    
      category.subCategories.push(subCategory);
      await expense.save();
      return res.status(200).json({ message: 'Subcategory added', expense });
    
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all expenses for a user
const getAllExpenses = async (req, res) => {
  try {
    const { userId } = req.params;
    const expenses = await Expense.find({ userId: new mongoose.Types.ObjectId(userId) });
    res.status(200).json({ expenses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Calculate daily total expense
const getDailyExpenses = async (req, res) => {
  try {
    const { userId, year, month, day } = req.params;
    const start = new Date(year, month - 1, day);
    const end = new Date(year, month - 1, day + 1);

    const totalExpense = await Expense.calculateTotalForPeriod(userId, start, end);

    res.status(200).json({ daily: totalExpense });
  } catch (error) {
    res.status(500).json({ message: error.message });
    console.log(error);
  }
};

const getWeeklyExpenses = async (req, res) => {
  try {
    const { userId, year, month, week } = req.params;
    const start = new Date(year, 0, 1 + (week - 1) * 7);
    start.setMonth(month - 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    console.log(end, start);

    const weeklyTotals = await Expense.calculateWeeklyTotal(userId, year, month);

    const weekExpense = weeklyTotals.find(w => w._id === parseInt(week));

    res.status(200).json({ weekly: weekExpense });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Calculate monthly total expense
const getMonthlyExpenses = async (req, res) => {
  try {
    const { userId, year, month } = req.params;
    const totalExpense = await Expense.calculateMonthlyTotal(userId, parseInt(year), parseInt(month));

    res.status(200).json({  totalExpense });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addExpense,
  addSubcategory,
  getAllExpenses,
  getDailyExpenses,
  getWeeklyExpenses,
  getMonthlyExpenses,
  
};
