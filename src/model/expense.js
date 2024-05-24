const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  description: { type: String },
});

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
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

module.exports = mongoose.model('Expense', expenseSchema);
