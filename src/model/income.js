const mongoose = require("mongoose");

const incomeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  source: { type: String, required: true },
  date: { type: Date, default: Date.now },
  weekOfMonth: { type: Number }
});

// Pre-save hook to calculate the week of the month
incomeSchema.pre('save', function(next) {
  const startDate = new Date(this.date.getFullYear(), this.date.getMonth(), 1);
  const dayOfMonth = this.date.getDate();
  const weekNumber = Math.ceil((dayOfMonth + startDate.getDay()) / 7);
  this.weekOfMonth = weekNumber;
  next();
});

incomeSchema.statics.calculateMonthlyTotal = async function(userId, year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  
  const totalIncome = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), date: { $gte: start, $lte: end } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  return totalIncome.length ? totalIncome[0].total : 0;
};

incomeSchema.statics.calculateWeeklyTotal = async function(userId, year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  const weeklyTotals = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: start, $lte: end }
      }
    },
    {
      $group: {
        _id: "$weekOfMonth",
        totalIncome: { $sum: "$amount" }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  return weeklyTotals;
};


module.exports = mongoose.model("Income", incomeSchema);
