const { check, validationResult } = require("express-validator");

// Shared validator response
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const signupValidator = [
  check("firstName").isString().notEmpty().withMessage("First name is required"),
  check("email").isEmail().withMessage("Valid email is required"),
  check("gender")
    .isIn(["male", "female"])
    .withMessage("Gender must be either 'male' or 'female'"),
  check("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  validate,
];

const loginValidator = [
  check("email").isEmail().withMessage("Valid email is required"),
  check("password").notEmpty().withMessage("Password is required"),
  validate,
];

const verifyOtpValidator = [
  check("email").isEmail().withMessage("Valid email is required"),
  check("otps")
    .isLength({ min: 4, max: 8 })
    .withMessage("OTP must be 4-8 digits"),
  validate,
];

module.exports = {
  signupValidator,
  loginValidator,
  verifyOtpValidator,
};
