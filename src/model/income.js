const mongoose = require("mongoose");

const incomeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: {
    type: Number,
    required: true,
  },
  source: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

incomeSchema.statics.calculateMonthlyTotal = async function(userId, year, month) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    
    const totalIncome = await this.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId), date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
  
    return totalIncome.length ? totalIncome[0].total : 0;
  };
  

module.exports = mongoose.model("Income", incomeSchema);
