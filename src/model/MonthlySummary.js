const mongoose = require('mongoose');

const monthlySummarySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true
  },
  totalIncome: {
    type: Number,
    default: 0
  },
  weeklySummaries: [
    {
      week: {
        type: Number,
        required: true
      },
      totalIncome: {
        type: Number,
        default: 0
      }
    }
  ]
});

module.exports = mongoose.model('MonthlySummary', monthlySummarySchema);

