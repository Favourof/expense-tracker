const mongoose = require("mongoose");

const { Schema } = mongoose;

const validateEmail = function (email) {
  let re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return re.test(email);
};

const UserSchema = Schema({
  firstName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: "Email address is required",
    trim: true,
    unique: true,
    validate: [validateEmail, "Please fill a valid email address"],
    lowercase: true,
  },
  isEmailVeried: {
    type: Boolean,
    default: false,
  },
  image: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  tokenVersion: {
    type: Number,
    default: 0,
  },
  gender: {
    type: String,
    required: true,
    validate: {
      validator: function (value) {
        return ["male", "female"].includes(value.toLowerCase());
      },
      message: (props) =>
        `${props.value} is not a valid gender. Gender must be either 'male' or 'female'.`,
    },
  },
});

UserSchema.set("toJSON", {
  transform: function (doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("User", UserSchema);
