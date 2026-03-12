const { check, validationResult } = require("express-validator");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

exports.validateIncome = [
  check("amount").isFloat({ gt: 0 }).withMessage("Amount must be greater than 0"),
  check("source").isString().notEmpty().withMessage("Source is required"),
  check("date").optional().isISO8601().withMessage("Date must be ISO8601"),
  validate,
];

exports.validateIncomeUpdate = [
  check("amount").optional().isFloat({ gt: 0 }).withMessage("Amount must be greater than 0"),
  check("note").optional().isString().withMessage("Note must be a string"),
  check("date").optional().isISO8601().withMessage("Date must be ISO8601"),
  validate,
];
