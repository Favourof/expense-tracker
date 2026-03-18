const Category = require("../model/Category");
const Transaction = require("../model/Transaction");
const MonthlySummary = require("../model/MonthlySummary");
const mongoose = require("mongoose");

const normalizeName = (value) => value.trim().toLowerCase();

const buildCategoryMap = (categories) => {
  const categoryNames = new Set();
  const subCategoryNames = new Map();

  categories.forEach((category) => {
    if (!category || !category.name) return;
    const categoryKey = normalizeName(category.name);
    categoryNames.add(categoryKey);

    if (Array.isArray(category.subCategories)) {
      category.subCategories.forEach((sub) => {
        if (!sub || !sub.name) return;
        const subKey = normalizeName(sub.name);
        if (!subCategoryNames.has(categoryKey)) {
          subCategoryNames.set(categoryKey, new Set());
        }
        subCategoryNames.get(categoryKey).add(subKey);
      });
    }
  });

  return { categoryNames, subCategoryNames };
};

const updateMonthlyExpenseSummary = async (userId, year, month) => {
  const totalExpenseAgg = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: "expense",
        isDeleted: false,
        timestamp: { $gte: new Date(year, month - 1, 1), $lte: new Date(year, month, 0) },
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const totalExpense = totalExpenseAgg.length ? totalExpenseAgg[0].total : 0;

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const startDay = start.getDay();

  const weeklyExpenseAgg = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        type: "expense",
        isDeleted: false,
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
        totalExpense: { $sum: "$amount" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const weeklyIncomeAgg = await Transaction.aggregate([
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

  const weeklyExpenseMap = new Map(weeklyExpenseAgg.map((w) => [w._id, w.totalExpense]));
  const weeklyIncomeMap = new Map(weeklyIncomeAgg.map((w) => [w._id, w.totalIncome]));

  await MonthlySummary.findOneAndUpdate(
    { userId, year, month },
    {
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

// Add or update an expense
const addExpense = async (req, res) => {
  try {
    const { categories, idempotencyKey } = req.body;
    const userId = req.user;
    const expenseDate = new Date();

    if (isNaN(expenseDate.getTime())) {
      throw new Error("Invalid date format");
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ message: "Categories are required" });
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    const summaryMonths = new Set();

    try {
      const { categoryNames, subCategoryNames } = buildCategoryMap(categories);
      const categoryNameList = Array.from(categoryNames);
      const existingCategories = await Category.find({
        userId: new mongoose.Types.ObjectId(userId),
        type: "expense",
        parentId: null,
        name: { $in: categoryNameList },
      }).session(session);

      const categoryMap = new Map(
        existingCategories.map((cat) => [normalizeName(cat.name), cat])
      );

      const newCategoryDocs = categoryNameList
        .filter((name) => !categoryMap.has(name))
        .map((name) => ({
          userId: new mongoose.Types.ObjectId(userId),
          name,
          type: "expense",
          parentId: null,
        }));

      if (newCategoryDocs.length > 0) {
        const inserted = await Category.insertMany(newCategoryDocs, { session });
        inserted.forEach((cat) => categoryMap.set(normalizeName(cat.name), cat));
      }

      const subCategoryQueries = [];
      categoryNameList.forEach((catName) => {
        const parent = categoryMap.get(catName);
        const subSet = subCategoryNames.get(catName);
        if (!parent || !subSet || subSet.size === 0) return;
        subCategoryQueries.push({
          userId: new mongoose.Types.ObjectId(userId),
          type: "expense",
          parentId: parent._id,
          name: { $in: Array.from(subSet) },
        });
      });

      const existingSubcategories = subCategoryQueries.length
        ? await Category.find({ $or: subCategoryQueries }).session(session)
        : [];

      const subCategoryMap = new Map();
      existingSubcategories.forEach((sub) => {
        const key = `${sub.parentId.toString()}|${normalizeName(sub.name)}`;
        subCategoryMap.set(key, sub);
      });

      const newSubCategoryDocs = [];
      categoryNameList.forEach((catName) => {
        const parent = categoryMap.get(catName);
        const subSet = subCategoryNames.get(catName);
        if (!parent || !subSet) return;
        subSet.forEach((subName) => {
          const key = `${parent._id.toString()}|${subName}`;
          if (!subCategoryMap.has(key)) {
            newSubCategoryDocs.push({
              userId: new mongoose.Types.ObjectId(userId),
              name: subName,
              type: "expense",
              parentId: parent._id,
            });
          }
        });
      });

      if (newSubCategoryDocs.length > 0) {
        const insertedSubs = await Category.insertMany(newSubCategoryDocs, { session });
        insertedSubs.forEach((sub) => {
          const key = `${sub.parentId.toString()}|${normalizeName(sub.name)}`;
          subCategoryMap.set(key, sub);
        });
      }

      const createdTransactions = [];
      let totalAmount = 0;

      for (const category of categories) {
        if (!category || !category.name || !Array.isArray(category.subCategories)) {
          continue;
        }
        const categoryDoc = categoryMap.get(normalizeName(category.name));
        if (!categoryDoc) continue;

        for (const subCategory of category.subCategories) {
          if (!subCategory || !subCategory.name || typeof subCategory.amount !== "number") {
            continue;
          }

          const subKey = `${categoryDoc._id.toString()}|${normalizeName(subCategory.name)}`;
          const subCategoryDoc = subCategoryMap.get(subKey);
          if (!subCategoryDoc) continue;

          const transaction = await Transaction.create(
            [
              {
                userId: new mongoose.Types.ObjectId(userId),
                type: "expense",
                amount: subCategory.amount,
                timestamp: subCategory.date ? new Date(subCategory.date) : expenseDate,
                categoryId: categoryDoc._id,
                subcategoryId: subCategoryDoc._id,
                source: "manual",
                note: subCategory.description || "",
                label: subCategory.label || "",
                idempotencyKey: idempotencyKey || undefined,
                isDeleted: false,
              },
            ],
            { session }
          );

          createdTransactions.push(transaction[0]);
          totalAmount += subCategory.amount;

          const txDate = subCategory.date ? new Date(subCategory.date) : expenseDate;
          const y = txDate.getFullYear();
          const m = txDate.getMonth() + 1;
          summaryMonths.add(`${y}-${m}`);
        }
      }

      await session.commitTransaction();
      for (const key of summaryMonths) {
        const [y, m] = key.split("-").map((v) => parseInt(v, 10));
        await updateMonthlyExpenseSummary(userId, y, m);
      }
      res.status(201).json({
        message: "Expenses added",
        count: createdTransactions.length,
        totalAmount,
        expenses: createdTransactions,
      });
    } catch (error) {
      await session.abortTransaction();
      if (error.code === 11000 && idempotencyKey) {
        return res.status(409).json({ message: "Duplicate request" });
      }
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const addSubcategory = async (req, res) => {
  try {
    const { categoryName, subCategory } = req.body;
    const userId = req.user;

    if (!userId || !categoryName || !subCategory || !subCategory.name) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const categoryDoc = await Category.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      type: "expense",
      parentId: null,
      name: normalizeName(categoryName),
    });

    if (!categoryDoc) {
      return res.status(404).json({ message: "Category not found" });
    }

    const subCategoryDoc = await Category.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        type: "expense",
        parentId: categoryDoc._id,
        name: normalizeName(subCategory.name),
      },
      {
        $setOnInsert: {
          userId: new mongoose.Types.ObjectId(userId),
          name: normalizeName(subCategory.name),
          type: "expense",
          parentId: categoryDoc._id,
        },
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      message: "Subcategory added",
      category: categoryDoc,
      subcategory: subCategoryDoc,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all expenses for a user
const getAllExpenses = async (req, res) => {
  try {
    const userId = req.user;
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
    const skip = (page - 1) * limit;
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;

    const match = {
      userId: new mongoose.Types.ObjectId(userId),
      type: "expense",
      isDeleted: false,
    };
    if (from || to) {
      match.timestamp = {};
      if (from) match.timestamp.$gte = from;
      if (to) match.timestamp.$lte = to;
    }

    const [items, total] = await Promise.all([
      Transaction.find(match).sort({ timestamp: -1 }).skip(skip).limit(limit),
      Transaction.countDocuments(match),
    ]);

    res.status(200).json({
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Calculate daily total expense
const getDailyExpenses = async (req, res) => {
  try {
    const userId = req.user;
    const { year, month, day } = req.params;
    const start = new Date(year, month - 1, day);
    const end = new Date(year, month - 1, day + 1);

    const totalExpenseAgg = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: "expense",
          isDeleted: false,
          timestamp: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalExpense = totalExpenseAgg.length ? totalExpenseAgg[0].total : 0;

    res.status(200).json({ totalExpense, date: start.toISOString().slice(0, 10) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getWeeklyExpenses = async (req, res) => {
  try {
    const userId = req.user;
    const { year, month, week } = req.params;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const startDay = start.getDay();

    const weeklyTotals = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: "expense",
          isDeleted: false,
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
        $group: { _id: "$weekOfMonth", totalAmount: { $sum: "$amount" } },
      },
      { $sort: { _id: 1 } },
    ]);

    const weekExpense = weeklyTotals.find((w) => w._id === parseInt(week, 10));

    res.status(200).json({
      weekly: weekExpense || { _id: parseInt(week, 10), totalAmount: 0 },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Calculate monthly total expense
const getMonthlyExpenses = async (req, res) => {
  try {
    const userId = req.user;
    const { year, month } = req.params;
    const totalExpenseAgg = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: "expense",
          isDeleted: false,
          timestamp: { $gte: new Date(year, month - 1, 1), $lte: new Date(year, month, 0) },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalExpense = totalExpenseAgg.length ? totalExpenseAgg[0].total : 0;

    res.status(200).json({ totalExpense });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateExpense = async (req, res) => {
  try {
    const userId = req.user;
    const { id } = req.params;
    const { amount, note, label, date, categoryId, subcategoryId } = req.body;

    const update = {};
    if (amount !== undefined) update.amount = amount;
    if (note !== undefined) update.note = note;
    if (label !== undefined) update.label = label;
    if (date) update.timestamp = new Date(date);
    if (categoryId) update.categoryId = categoryId;
    if (subcategoryId) update.subcategoryId = subcategoryId;

    const existing = await Transaction.findOne({
      _id: id,
      userId: new mongoose.Types.ObjectId(userId),
      type: "expense",
      isDeleted: false,
    });

    if (!existing) {
      return res.status(404).json({ message: "Expense not found" });
    }

    const updated = await Transaction.findOneAndUpdate(
      { _id: id, userId: new mongoose.Types.ObjectId(userId), type: "expense", isDeleted: false },
      { $set: update },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Expense not found" });
    }

    const oldYear = existing.timestamp.getFullYear();
    const oldMonth = existing.timestamp.getMonth() + 1;
    await updateMonthlyExpenseSummary(userId, oldYear, oldMonth);

    const newYear = updated.timestamp.getFullYear();
    const newMonth = updated.timestamp.getMonth() + 1;
    if (newYear !== oldYear || newMonth !== oldMonth) {
      await updateMonthlyExpenseSummary(userId, newYear, newMonth);
    }

    res.status(200).json({ message: "Expense updated", expense: updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const userId = req.user;
    const { id } = req.params;

    const deleted = await Transaction.findOneAndUpdate(
      { _id: id, userId: new mongoose.Types.ObjectId(userId), type: "expense", isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true }
    );

    if (!deleted) {
      return res.status(404).json({ message: "Expense not found" });
    }

    const year = deleted.timestamp.getFullYear();
    const month = deleted.timestamp.getMonth() + 1;
    await updateMonthlyExpenseSummary(userId, year, month);

    res.status(200).json({ message: "Expense deleted" });
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
  updateExpense,
  deleteExpense,
};
