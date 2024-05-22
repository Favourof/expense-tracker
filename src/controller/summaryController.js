const MonthlySummary = require('../model/MonthlySummary');

const getMonthlySummary = async (req, res) => {
  try {
    const { userId, year, month } = req.params;
    const summary = await MonthlySummary.findOne({ userId, year, month });
    if (!summary) {
      return res.status(404).json({ message: 'Summary not found' });
    }
    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getMonthlySummary };
