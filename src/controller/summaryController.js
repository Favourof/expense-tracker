const MonthlySummary = require("../model/MonthlySummary");
const Transaction = require("../model/Transaction");
const mongoose = require("mongoose");



const calculateWeeklySummaries = async (userId, year, month) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const startDay = start.getDay(); // 0-6, Sunday-based

  const weeklySummaries = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: "income",
        timestamp: { $gte: start, $lte: end },
      },
    },
    {
      $addFields: {
        weekOfMonth: {
          $ceil: {
            $divide: [{ $add: [{ $dayOfMonth: "$timestamp" }, startDay] }, 7],
          },
        },
      },
    },
    {
      $group: {
        _id: "$weekOfMonth",
        totalIncome: { $sum: "$amount" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return weeklySummaries.map((week) => ({
    week: week._id,
    totalIncome: week.totalIncome,
  }));
};


const getWeeklySummariesForMonth = async (req, res) => {
  try {
    const userId = req.user;
    const { year, month } = req.params;

    const weeklySummaries = await calculateWeeklySummaries(
      userId,
      parseInt(year, 10),
      parseInt(month, 10)
    );

    res.status(200).json(weeklySummaries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const buildMonthlySummary = async (userId, year, month) => {
  const periodStart = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  const periodEnd = new Date(parseInt(year, 10), parseInt(month, 10), 0);
  const startDay = periodStart.getDay();

  const [incomeAgg, expenseAgg, weeklyIncomeAgg, weeklyExpenseAgg] = await Promise.all([
    Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: "income",
          timestamp: { $gte: periodStart, $lte: periodEnd },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: "expense",
          isDeleted: false,
          timestamp: { $gte: periodStart, $lte: periodEnd },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: "income",
          timestamp: { $gte: periodStart, $lte: periodEnd },
        },
      },
      {
        $addFields: {
          weekOfMonth: {
            $ceil: {
              $divide: [{ $add: [{ $dayOfMonth: "$timestamp" }, startDay] }, 7],
            },
          },
        },
      },
      {
        $group: { _id: "$weekOfMonth", totalIncome: { $sum: "$amount" } },
      },
      { $sort: { _id: 1 } },
    ]),
    Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: "expense",
          isDeleted: false,
          timestamp: { $gte: periodStart, $lte: periodEnd },
        },
      },
      {
        $addFields: {
          weekOfMonth: {
            $ceil: {
              $divide: [{ $add: [{ $dayOfMonth: "$timestamp" }, startDay] }, 7],
            },
          },
        },
      },
      {
        $group: { _id: "$weekOfMonth", totalExpense: { $sum: "$amount" } },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const totalIncome = incomeAgg.length ? incomeAgg[0].total : 0;
  const totalExpense = expenseAgg.length ? expenseAgg[0].total : 0;
  const weeklyIncomeMap = new Map(weeklyIncomeAgg.map((w) => [w._id, w.totalIncome]));
  const weeklyExpenseMap = new Map(weeklyExpenseAgg.map((w) => [w._id, w.totalExpense]));

  return MonthlySummary.findOneAndUpdate(
    { userId, year, month },
    {
      totalIncome,
      totalExpense,
      weeklySummaries: [1, 2, 3, 4, 5].map((week) => ({
        week,
        totalIncome: weeklyIncomeMap.get(week) || 0,
        totalExpense: weeklyExpenseMap.get(week) || 0,
      })),
    },
    { upsert: true, new: true }
  );
};

const getMonthlySummary = async (req, res) => {
  try {
    const userId = req.user;
    const { year, month } = req.params;

    let summary = await MonthlySummary.findOne({ userId, year, month });
    if (
      !summary ||
      summary.totalExpense === undefined ||
      summary.totalIncome === undefined ||
      !summary.weeklySummaries ||
      summary.weeklySummaries.length === 0
    ) {
      summary = await buildMonthlySummary(userId, year, month);
    }
    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getWeeklySummaryCombined = async (req, res) => {
  try {
    const userId = req.user;
    const { year, month } = req.params;

    let summary = await MonthlySummary.findOne({ userId, year, month });
    if (!summary || !summary.weeklySummaries || summary.weeklySummaries.length === 0) {
      summary = await buildMonthlySummary(userId, year, month);
    }

    res.status(200).json(summary.weeklySummaries || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMonthlySummary,
  getWeeklySummariesForMonth,
  getWeeklySummaryCombined,
};
