const { check, validationResult } = require("express-validator");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const validateAddExpense = [
  check("categories").isArray({ min: 1 }).withMessage("Categories are required"),
  check("categories.*.name").isString().notEmpty().withMessage("Category name is required"),
  check("categories.*.subCategories")
    .isArray({ min: 1 })
    .withMessage("Subcategories are required"),
  check("categories.*.subCategories.*.name")
    .isString()
    .notEmpty()
    .withMessage("Subcategory name is required"),
  check("categories.*.subCategories.*.amount")
    .isFloat({ gt: 0 })
    .withMessage("Amount must be greater than 0"),
  check("categories.*.subCategories.*.date")
    .optional()
    .isISO8601()
    .withMessage("Date must be ISO8601"),
  check("categories.*.subCategories.*.description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),
  check("categories.*.subCategories.*.label")
    .optional()
    .isString()
    .withMessage("Label must be a string"),
  check("idempotencyKey")
    .optional()
    .isString()
    .isLength({ min: 8, max: 128 })
    .withMessage("idempotencyKey must be 8-128 chars"),
  validate,
];

const validateAddSubcategory = [
  check("categoryName").isString().notEmpty().withMessage("Category name is required"),
  check("subCategory.name")
    .isString()
    .notEmpty()
    .withMessage("Subcategory name is required"),
  validate,
];

const validateUpdateExpense = [
  check("amount").optional().isFloat({ gt: 0 }).withMessage("Amount must be greater than 0"),
  check("note").optional().isString().withMessage("Note must be a string"),
  check("label").optional().isString().withMessage("Label must be a string"),
  check("date").optional().isISO8601().withMessage("Date must be ISO8601"),
  check("categoryId").optional().isMongoId().withMessage("Invalid category ID"),
  check("subcategoryId").optional().isMongoId().withMessage("Invalid subcategory ID"),
  validate,
];

module.exports = { validateAddExpense, validateAddSubcategory, validateUpdateExpense };
