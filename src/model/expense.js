// const mongoose = require('mongoose');

// const subCategorySchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   amount: { type: Number, required: true },
//   description: { type: String },
// });

// const categorySchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   subCategories: [subCategorySchema],
// });

// const expenseSchema = new mongoose.Schema({
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//   categories: [categorySchema],
//   date: { type: Date, default: Date.now },
// }, { timestamps: true });

// expenseSchema.index({ userId: 1, date: 1 });
// expenseSchema.index({ userId: 1, 'categories.name': 1 });
// expenseSchema.index({ userId: 1, 'categories.subCategories.name': 1 });

// expenseSchema.statics.calculateTotalForPeriod = async function(userId, start, end) {
//   const totalExpense = await this.aggregate([
//     { $match: { userId: new mongoose.Types.ObjectId(userId), date: { $gte: start, $lte: end } } },
//     { $unwind: '$categories' },
//     { $unwind: '$categories.subCategories' },
//     { $group: { _id: null, total: { $sum: '$categories.subCategories.amount' } } },
//   ]);

//   return totalExpense.length ? totalExpense[0].total : 0;
// };

// // Calculate monthly total expense
// expenseSchema.statics.calculateMonthlyTotal = async function(userId, year, month) {
//   const start = new Date(year, month - 1, 1);
//   const end = new Date(year, month, 0);

//   return await this.calculateTotalForPeriod(userId, start, end);
// };

// // Calculate weekly total expense
// expenseSchema.statics.calculateWeeklyTotal = async function(userId, year, month) {
//   const start = new Date(year, month - 1, 1);
//   const end = new Date(year, month, 0);

//   const weeklyTotals = await this.aggregate([
//     {
//       $match: {
//         userId: new mongoose.Types.ObjectId(userId),
//         date: { $gte: start, $lte: end }
//       }
//     },
//     {
//       $group: {
//         _id: "$weekOfMonth",
//         totalIncome: { $sum: "$amount" }
//       }
//     },
//     {
//       $sort: { _id: 1 }
//     }
//   ]);

//   return weeklyTotals;
// };

// expenseSchema.statics.calculateMonthlyTotal = async function(userId, year, month) {
//   const start = new Date(year, month - 1, 1);
//   const end = new Date(year, month, 0);

//   const totalExpense = await this.aggregate([
//     { $match: { userId: new mongoose.Types.ObjectId(userId), date: { $gte: start, $lte: end } } },
//     { $unwind: '$categories' },
//     { $unwind: '$categories.subCategories' },
//     { $group: { _id: null, total: { $sum: '$categories.subCategories.amount' } } },
//   ]);

//   return totalExpense.length ? totalExpense[0].total : 0;
// };

// module.exports = mongoose.model('Expense', expenseSchema);



const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  description: { type: String },
  date: { type: Date, default: Date.now },
});

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: Date, default: Date.now },
  subCategories: [subCategorySchema],
});

const expenseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  categories: [categorySchema],
  date: { type: Date, default: Date.now },
}, { timestamps: true });

expenseSchema.index({ userId: 1, date: 1 });
expenseSchema.index({ userId: 1, 'categories.name': 1 });
expenseSchema.index({ userId: 1, 'categories.subCategories.name': 1 });

expenseSchema.statics.calculateTotalForPeriod = async function(userId, start, end) {
  const totalExpense = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), date: { $gte: start, $lte: end } } },
    { $unwind: '$categories' },
    { $unwind: '$categories.subCategories' },
    { $group: { _id: null, total: { $sum: '$categories.subCategories.amount' } } },
  ]);

  return totalExpense.length ? totalExpense[0].total : 0;
};

// Calculate monthly total expense
expenseSchema.statics.calculateMonthlyTotal = async function(userId, year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  return await this.calculateTotalForPeriod(userId, start, end);
};

// Calculate weekly total expense
expenseSchema.statics.calculateWeeklyTotal = async function(userId, year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  const weeklyTotals = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: start, $lte: end }
      }
    },
    { $unwind: '$categories' },
    { $unwind: '$categories.subCategories' },
    {
      $group: {
        _id: { $week: "$date" },
        totalAmount: { $sum: "$categories.subCategories.amount" }
      }
    },
    {
      $sort: { "_id": 1 }
    }
  ]);

  return weeklyTotals;
};

module.exports = mongoose.model('Expense', expenseSchema);
