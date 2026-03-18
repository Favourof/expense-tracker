const MonthlySummary = require("../model/MonthlySummary");
const Transaction = require("../model/Transaction");
const mongoose = require("mongoose");

const updateMonthlyIncomeSummary = async (userId, year, month) => {
  const totalIncomeAgg = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: "income",
        timestamp: { $gte: new Date(year, month - 1, 1), $lte: new Date(year, month, 0) },
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const totalIncome = totalIncomeAgg.length ? totalIncomeAgg[0].total : 0;

  await MonthlySummary.findOneAndUpdate(
    { userId, year, month },
    { totalIncome },
    { upsert: true, new: true }
  );
};

const addIncome = async (req, res) => {
  try {
    const { amount, source, date } = req.body;
    const userId = req.user;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const incomeDate = date ? new Date(date) : new Date();

    if (isNaN(incomeDate.getTime())) {
      throw new Error("Invalid date format");
    }

    const newIncome = await Transaction.create({
      userId: new mongoose.Types.ObjectId(userId),
      type: "income",
      amount,
      timestamp: incomeDate,
      source: "manual",
      note: source,
    });

    const year = incomeDate.getFullYear();
    const month = incomeDate.getMonth() + 1;
  

    await updateMonthlyIncomeSummary(userId, year, month);
    const summary = await MonthlySummary.findOne({ userId, year, month });

    // calculateWeeklySummaries()

    res.status(201).json({
      message: "Income added",
      income: newIncome,
      summary,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getIncomes = async (req, res) => {
  try {
    const userId = req.user;
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const [items, total] = await Promise.all([
      Transaction.find({ userId, type: "income" })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments({ userId, type: "income" }),
    ]);

    res.status(200).json({
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateIncome = async (req, res) => {
  try {
    const userId = req.user;
    const { id } = req.params;
    const { amount, note, date } = req.body;

    const existing = await Transaction.findOne({
      _id: id,
      userId: new mongoose.Types.ObjectId(userId),
      type: "income",
    });

    if (!existing) {
      return res.status(404).json({ message: "Income not found" });
    }

    const update = {};
    if (amount !== undefined) update.amount = amount;
    if (note !== undefined) update.note = note;
    if (date) update.timestamp = new Date(date);

    const updated = await Transaction.findOneAndUpdate(
      { _id: id, userId: new mongoose.Types.ObjectId(userId), type: "income" },
      { $set: update },
      { new: true }
    );

    const oldYear = existing.timestamp.getFullYear();
    const oldMonth = existing.timestamp.getMonth() + 1;
    await updateMonthlyIncomeSummary(userId, oldYear, oldMonth);

    const newYear = updated.timestamp.getFullYear();
    const newMonth = updated.timestamp.getMonth() + 1;
    if (newYear !== oldYear || newMonth !== oldMonth) {
      await updateMonthlyIncomeSummary(userId, newYear, newMonth);
    }

    res.status(200).json({ message: "Income updated", income: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteIncome = async (req, res) => {
  try {
    const userId = req.user;
    const { id } = req.params;

    const deleted = await Transaction.findOneAndDelete({
      _id: id,
      userId: new mongoose.Types.ObjectId(userId),
      type: "income",
    });

    if (!deleted) {
      return res.status(404).json({ message: "Income not found" });
    }

    const year = deleted.timestamp.getFullYear();
    const month = deleted.timestamp.getMonth() + 1;
    await updateMonthlyIncomeSummary(userId, year, month);

    res.status(200).json({ message: "Income deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addIncome, getIncomes, updateIncome, deleteIncome };
