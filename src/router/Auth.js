const express = require("express");
const {
  handleSignUp,
  handleOtpverify,
  handleLogIn,
  handleCheckAuth,
  handleRefreshToken,
  handleLogout,
} = require("../controller/Auth");
const {
  signupValidator,
  loginValidator,
  verifyOtpValidator,
} = require("../validation/authValidator");
const { verifyToken } = require("../middleWare/verifyToken");
const multerUploads = require("../utils/multerUpload");

const route = express.Router();

route.post("/signupuser", multerUploads.single("image"), signupValidator, handleSignUp);
route.post("/verifyotp", verifyOtpValidator, handleOtpverify);
route.post("/loginuser", loginValidator, handleLogIn);
route.post("/checkauth", verifyToken, handleCheckAuth);
route.post("/refresh", handleRefreshToken);
route.post("/logout", verifyToken, handleLogout);

module.exports = route;
