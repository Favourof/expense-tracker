const mongoose = require("mongoose");
const env = require("../config/env");
const Category = require("../src/model/Category");
const Transaction = require("../src/model/Transaction");
const MonthlySummary = require("../src/model/MonthlySummary");

const parseArgs = () => {
  const args = process.argv.slice(2);
  const out = {};
  args.forEach((arg) => {
    const [key, value] = arg.split("=");
    if (key && value !== undefined) out[key] = value;
  });
  return out;
};

const defaults = {
  expense: {
    Food: ["Groceries", "Restaurants", "Snacks", "Drinks"],
    Transport: ["Fuel", "Ride-hailing", "Public transport", "Repairs"],
    Housing: ["Rent", "Electricity", "Water", "Internet", "Maintenance"],
    Utilities: ["Power", "Gas", "Waste", "Cable TV"],
    Health: ["Hospital", "Pharmacy", "Insurance"],
    Education: ["Tuition", "Books", "Courses"],
    Family: ["Childcare", "Support", "Gifts"],
    Lifestyle: ["Entertainment", "Gym", "Subscriptions"],
    Shopping: ["Clothing", "Accessories", "Electronics"],
    Business: ["Inventory", "Supplies", "Marketing"],
    Savings: ["Emergency fund", "Investments"],
    Giving: ["Tithes", "Charity"],
  },
  income: {
    Salary: ["Monthly salary", "Bonus"],
    Business: ["Sales", "Services"],
    Freelance: ["Projects", "Consulting"],
    Gifts: ["Family", "Friends"],
    Investments: ["Dividends", "Interest"],
  },
};

const normalize = (v) => v.trim().toLowerCase();

const seedCategories = async (userId) => {
  const created = { expense: [], income: [] };

  for (const [type, groups] of Object.entries(defaults)) {
    for (const [parentName, children] of Object.entries(groups)) {
      const parent = await Category.findOneAndUpdate(
        {
          userId,
          type,
          parentId: null,
          name: normalize(parentName),
        },
        {
          $setOnInsert: {
            userId,
            type,
            name: normalize(parentName),
            parentId: null,
            isDefault: true,
          },
        },
        { upsert: true, new: true }
      );

      created[type].push(parent);

      for (const childName of children) {
        const child = await Category.findOneAndUpdate(
          {
            userId,
            type,
            parentId: parent._id,
            name: normalize(childName),
          },
          {
            $setOnInsert: {
              userId,
              type,
              name: normalize(childName),
              parentId: parent._id,
              isDefault: true,
            },
          },
          { upsert: true, new: true }
        );
        created[type].push(child);
      }
    }
  }

  return created;
};

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const buildMonthlySummary = async (userId, year, month) => {
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0);
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
      { $group: { _id: "$weekOfMonth", totalIncome: { $sum: "$amount" } } },
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
      { $group: { _id: "$weekOfMonth", totalExpense: { $sum: "$amount" } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const totalIncome = incomeAgg.length ? incomeAgg[0].total : 0;
  const totalExpense = expenseAgg.length ? expenseAgg[0].total : 0;
  const weeklyIncomeMap = new Map(weeklyIncomeAgg.map((w) => [w._id, w.totalIncome]));
  const weeklyExpenseMap = new Map(weeklyExpenseAgg.map((w) => [w._id, w.totalExpense]));

  await MonthlySummary.findOneAndUpdate(
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

const seedTransactions = async (userId, categories) => {
  const now = new Date();
  const monthsTouched = new Set();

  const expenseParents = categories.expense.filter((c) => !c.parentId);
  const incomeParents = categories.income.filter((c) => !c.parentId);

  const expenseChildrenByParent = new Map();
  categories.expense.forEach((c) => {
    if (!c.parentId) return;
    const key = c.parentId.toString();
    if (!expenseChildrenByParent.has(key)) expenseChildrenByParent.set(key, []);
    expenseChildrenByParent.get(key).push(c);
  });

  const incomeChildrenByParent = new Map();
  categories.income.forEach((c) => {
    if (!c.parentId) return;
    const key = c.parentId.toString();
    if (!incomeChildrenByParent.has(key)) incomeChildrenByParent.set(key, []);
    incomeChildrenByParent.get(key).push(c);
  });

  const txs = [];

  for (let i = 0; i < 30; i++) {
    const parent = randomFrom(expenseParents);
    const children = expenseChildrenByParent.get(parent._id.toString()) || [];
    const sub = children.length ? randomFrom(children) : null;

    const daysAgo = Math.floor(Math.random() * 60);
    const timestamp = new Date(now);
    timestamp.setDate(now.getDate() - daysAgo);

    txs.push({
      userId,
      type: "expense",
      amount: Math.floor(500 + Math.random() * 15000),
      timestamp,
      categoryId: parent._id,
      subcategoryId: sub ? sub._id : null,
      source: "manual",
      note: "seed",
      idempotencyKey: `seed-expense-${Date.now()}-${i}-${Math.random()}`,
      isDeleted: false,
    });

    monthsTouched.add(`${timestamp.getFullYear()}-${timestamp.getMonth() + 1}`);
  }

  for (let i = 0; i < 20; i++) {
    const parent = randomFrom(incomeParents);
    const children = incomeChildrenByParent.get(parent._id.toString()) || [];
    const sub = children.length ? randomFrom(children) : null;

    const daysAgo = Math.floor(Math.random() * 60);
    const timestamp = new Date(now);
    timestamp.setDate(now.getDate() - daysAgo);

    txs.push({
      userId,
      type: "income",
      amount: Math.floor(1000 + Math.random() * 50000),
      timestamp,
      categoryId: parent._id,
      subcategoryId: sub ? sub._id : null,
      source: "manual",
      note: "seed",
      idempotencyKey: `seed-income-${Date.now()}-${i}-${Math.random()}`,
    });

    monthsTouched.add(`${timestamp.getFullYear()}-${timestamp.getMonth() + 1}`);
  }

  await Transaction.insertMany(txs);

  for (const key of monthsTouched) {
    const [y, m] = key.split("-").map((v) => parseInt(v, 10));
    await buildMonthlySummary(userId, y, m);
  }
};

const run = async () => {
  const args = parseArgs();
  const userId = args.userId || process.env.SEED_USER_ID;

  if (!userId) {
    console.error("Missing userId. Use userId=<id> or set SEED_USER_ID.");
    process.exit(1);
  }

  await mongoose.connect(env.mongoURL);

  await Promise.all([
    Transaction.deleteMany({ userId }),
    Category.deleteMany({ userId }),
    MonthlySummary.deleteMany({ userId }),
  ]);

  const seededCategories = await seedCategories(userId);
  await seedTransactions(userId, seededCategories);

  console.log(`Reseeded data for user ${userId}.`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("Reseed failed:", err.message);
  process.exit(1);
});
