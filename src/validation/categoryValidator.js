const { check, validationResult } = require("express-validator");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const validateCreateCategory = [
  check("name").isString().notEmpty().withMessage("Name is required"),
  check("type")
    .isIn(["income", "expense"])
    .withMessage("Type must be income or expense"),
  check("parentId").optional().isMongoId().withMessage("Invalid parentId"),
  check("isDefault").optional().isBoolean().withMessage("isDefault must be boolean"),
  validate,
];

const validateUpdateCategory = [
  check("name").optional().isString().notEmpty().withMessage("Name is required"),
  check("isDefault").optional().isBoolean().withMessage("isDefault must be boolean"),
  validate,
];

module.exports = { validateCreateCategory, validateUpdateCategory };
