const express = require("express");
const { handleSignUp, handleOtpverify, handleLogIn, handleCheckAuth } = require("../controller/Auth");
const { verifyToken } = require("../middleWare/verifyToken");
const multerUploads = require("../utils/multerUpload");

const route = express.Router();

route.post("/signupuser", multerUploads.single("image"), handleSignUp);
route.post("/verifyotp", handleOtpverify);
route.post("/loginuser", handleLogIn);
route.post("/checkauth", verifyToken, handleCheckAuth);

module.exports = route;
