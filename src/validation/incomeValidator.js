const { check, validationResult } = require('express-validator');

exports.validateIncome = [
  check('userId').isMongoId().withMessage('Invalid user ID'),
  check('amount').isNumeric().withMessage('Amount must be a number'),
  check('source').notEmpty().withMessage('Source is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
   