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

const calculateIncomeInsights = async (userId, year, month) => {
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0);
  const prevStart = new Date(year, month - 2, 1);
  const prevEnd = new Date(year, month - 1, 0);
  const startDay = periodStart.getDay();
  const today = new Date();
  const last14Start = new Date(today);
  last14Start.setDate(today.getDate() - 13);
  last14Start.setHours(0, 0, 0, 0);

  const [totalAgg, weeklyAgg, sourceAgg, prevTotalAgg, largestAgg, activeDaysAgg, last14Agg] = await Promise.all([
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
      { $group: { _id: "$weekOfMonth", totalIncome: { $sum: "$amount" } } },
      { $sort: { _id: 1 } },
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
        $project: {
          amount: 1,
          source: {
            $trim: {
              input: { $ifNull: ["$note", "Unknown"] },
            },
          },
        },
      },
      { $group: { _id: "$source", total: { $sum: "$amount" } } },
      { $sort: { total: -1 } },
      { $limit: 5 },
    ]),
    Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: "income",
          timestamp: { $gte: prevStart, $lte: prevEnd },
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
      { $sort: { amount: -1 } },
      { $limit: 1 },
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
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
          },
        },
      },
      { $count: "days" },
    ]),
    Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: "income",
          timestamp: { $gte: last14Start, $lte: today },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
          },
        },
      },
      { $count: "days" },
    ]),
  ]);

  const totalIncome = totalAgg.length ? totalAgg[0].total : 0;
  const prevTotalIncome = prevTotalAgg.length ? prevTotalAgg[0].total : 0;
  const monthChangePercent =
    prevTotalIncome > 0
      ? Number(
          (((totalIncome - prevTotalIncome) / prevTotalIncome) * 100).toFixed(
            2,
          ),
        )
      : null;

  const weeklySummaries = [1, 2, 3, 4, 5].map((week) => {
    const match = weeklyAgg.find((w) => w._id === week);
    return { week, totalIncome: match ? match.totalIncome : 0 };
  });

  const topSources = sourceAgg.map((source) => ({
    source: source._id || "Unknown",
    total: source.total,
  }));

  const largestIncome = largestAgg.length
    ? {
        amount: largestAgg[0].amount,
        date: largestAgg[0].timestamp,
        source: largestAgg[0].note || "Income",
      }
    : null;

  const activeDaysThisMonth = activeDaysAgg.length ? activeDaysAgg[0].days : 0;
  const last14DaysActive = last14Agg.length ? last14Agg[0].days : 0;
  const daysInMonth = periodEnd.getDate();

  return {
    year,
    month,
    totalIncome,
    previousMonthIncome: prevTotalIncome,
    monthChangePercent,
    weeklySummaries,
    topSources,
    largestIncome,
    activeDaysThisMonth,
    daysInMonth,
    last14DaysActive,
  };
};

const getWeeklySummariesForMonth = async (req, res) => {
  try {
    const userId = req.user;
    const { year, month } = req.params;

    const weeklySummaries = await calculateWeeklySummaries(
      userId,
      parseInt(year, 10),
      parseInt(month, 10),
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

  const [incomeAgg, expenseAgg, weeklyIncomeAgg, weeklyExpenseAgg] =
    await Promise.all([
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
                $divide: [
                  { $add: [{ $dayOfMonth: "$timestamp" }, startDay] },
                  7,
                ],
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
                $divide: [
                  { $add: [{ $dayOfMonth: "$timestamp" }, startDay] },
                  7,
                ],
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
  const weeklyIncomeMap = new Map(
    weeklyIncomeAgg.map((w) => [w._id, w.totalIncome]),
  );
  const weeklyExpenseMap = new Map(
    weeklyExpenseAgg.map((w) => [w._id, w.totalExpense]),
  );

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
    { upsert: true, new: true },
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
    if (
      !summary ||
      !summary.weeklySummaries ||
      summary.weeklySummaries.length === 0
    ) {
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
  calculateIncomeInsights,
};
