const mongoose = require('mongoose');

const monthlySummarySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  totalIncome: { type: Number, required: true, default: 0 }
});

monthlySummarySchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('MonthlySummary', monthlySummarySchema);
