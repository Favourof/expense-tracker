const User = require("../model/Auth");
const { UserZodSchema } = require("../utils/zodSchema");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cloudinary = require("../utils/cloudinary-setup");
const { randomUUID } = require("crypto");
const { getRedisClient } = require("../utils/redisClient");
const logger = require("../utils/logger");
const env = require("../../config/env");
const { toUserDto } = require("../utils/userDto");
const Otpmodel = require("../model/otp");
const { sendVerificationCode, sendWelcomeEmail } = require("../mailer/mail");

const createAccessToken = (id, email) => {
  return jwt.sign(
    { email, id, type: "access", jti: randomUUID() },
    env.JWT_SECRET,
    { expiresIn: env.JWT_LIFETIME || "15m" }
  );
};

const createRefreshToken = (id, tokenVersion) => {
  return jwt.sign(
    { id, tokenVersion, type: "refresh", jti: randomUUID() },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_LIFETIME || "7d" }
  );
};

// Cookie helpers keep refresh tokens HttpOnly
const setRefreshCookie = (res, token) => {
  const cookieDomain = env.isProd && env.COOKIE_DOMAIN ? env.COOKIE_DOMAIN : undefined;
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    domain: cookieDomain,
    path: "/",
  });
};

const clearRefreshCookie = (res) => {
  const cookieDomain = env.isProd && env.COOKIE_DOMAIN ? env.COOKIE_DOMAIN : undefined;
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    domain: cookieDomain,
    path: "/",
  });
};

async function handleSignUp(req, res) {
  const { firstName, email, gender, password } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "User already exist" });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "SQIImage",
    });

    const validatedData = UserZodSchema.parse({
      firstName,
      email,
      gender,
      password,
      image: result.secure_url,
    });

    const salt = await bcrypt.genSalt();
    validatedData.password = await bcrypt.hash(password, salt);

    const response = await User.create(validatedData);
    res.status(200).json(toUserDto(response));

    handleSendOtpVerification({ email });
  } catch (error) {
    res.status(500).json({ error: "error creating data", error });
    logger.error("auth_signup_error", { message: error.message, stack: error.stack });
  }
}

const handleSendOtpVerification = async ({ email }) => {
  try {
    const otp = `${Math.floor(10000 + Math.random() * 90000)}`;
    const salt = await bcrypt.genSalt();
    const otps = await bcrypt.hash(otp, salt);

    const response = await Otpmodel.create({
      email,
      createdAt: Date.now(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      otps,
    });

    await sendVerificationCode({ email, otp });
    logger.info("otp_created", { email, otpId: response._id.toString() });
  } catch (error) {
    logger.error("otp_send_error", { message: error.message, stack: error.stack });
  }
};

const handleOtpverify = async (req, res) => {
  const { email, otps } = req.body;
  try {
    if (!email || !otps) {
      return res.status(404).json({ message: "please fill all details" });
    }

    const userOtpVerificationRecord = await Otpmodel.find({ email });
    if (userOtpVerificationRecord.length <= 0) {
      return res.status(404).json({
        message: "Account Record not found or Already verify, Sign up or log in",
      });
    }

    const { expiresAt } = userOtpVerificationRecord[0];
    const hashOtp = userOtpVerificationRecord[0].otps;

    if (expiresAt < Date.now()) {
      await Otpmodel.deleteMany({ email });
      return res
        .status(200)
        .json({ message: "otp expire, request for another one" });
    }

    const isMatch = await bcrypt.compare(otps, hashOtp);
    if (!isMatch) {
      return res.status(404).json({ message: "invalid Otp check your mail" });
    }

    await Otpmodel.deleteMany({ email });
    await sendWelcomeEmail({ email });
    await User.updateOne({ email }, { isEmailVeried: true });
    return res.status(200).json({ message: "otp verified" });
  } catch (error) {
    logger.error("otp_verify_error", { message: error.message, stack: error.stack });
    return res.json(error);
  }
};

async function handleLogIn(req, res) {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(404).json({ message: "please fill all details" });
    }

    const userDetails = await User.findOne({ email });
    if (!userDetails) {
      return res.status(404).json({ message: "invalid login Credentail" });
    }

    const isMatch = await bcrypt.compare(password, userDetails.password);
    if (!isMatch) {
      return res.status(404).json({ message: "invalid login Credentail" });
    }

    if (userDetails.isEmailVeried == false) {
      return res.status(404).json({ message: "your Account is not Verify" });
    }

    const accessToken = createAccessToken(userDetails._id, userDetails.email);
    const refreshToken = createRefreshToken(
      userDetails._id,
      userDetails.tokenVersion
    );

    const client = await getRedisClient();
    const decodedRefresh = jwt.decode(refreshToken);
    const ttl = Math.max(decodedRefresh.exp - Math.floor(Date.now() / 1000), 0);
    await client.set(`refresh:${decodedRefresh.jti}`, userDetails._id.toString(), {
      EX: ttl,
    });

    logger.info("auth_login", { userId: userDetails._id.toString() });
    setRefreshCookie(res, refreshToken);
    res.json({ message: "u are logged in", accessToken });
  } catch (error) {
    logger.error("auth_login_error", { message: error.message, stack: error.stack });
    res.status(500).json({ error: "error creating data", error });
  }
}

const handleCheckAuth = async (req, res) => {
  const user = await User.findById(req.user);
  if (!user) {
    return res.status(404).json({ message: "user not found" });
  }
  res.status(200).json(toUserDto(user));
};

const handleRefreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies && req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token cookie required" });
    }

    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    if (decoded.type !== "refresh") {
      return res.status(401).json({ message: "Invalid token type" });
    }

    const user = await User.findById(decoded.id);
    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const client = await getRedisClient();
    const exists = await client.get(`refresh:${decoded.jti}`);
    if (!exists) {
      return res.status(401).json({ message: "Refresh token revoked" });
    }

    await client.del(`refresh:${decoded.jti}`);

    const newAccessToken = createAccessToken(user._id, user.email);
    const newRefreshToken = createRefreshToken(user._id, user.tokenVersion);
    const newDecodedRefresh = jwt.decode(newRefreshToken);
    const ttl = Math.max(newDecodedRefresh.exp - Math.floor(Date.now() / 1000), 0);
    await client.set(`refresh:${newDecodedRefresh.jti}`, user._id.toString(), {
      EX: ttl,
    });

    logger.info("auth_refresh", { userId: user._id.toString() });
    setRefreshCookie(res, newRefreshToken);
    return res.json({ accessToken: newAccessToken });
  } catch (error) {
    logger.error("auth_refresh_error", { message: error.message, stack: error.stack });
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};

const handleLogout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;
    const refreshToken = req.cookies && req.cookies.refreshToken;

    const client = await getRedisClient();

    if (accessToken) {
      const decoded = jwt.decode(accessToken);
      if (decoded && decoded.jti && decoded.exp) {
        const ttl = Math.max(decoded.exp - Math.floor(Date.now() / 1000), 0);
        if (ttl > 0) {
          await client.set(`bl:${decoded.jti}`, "1", { EX: ttl });
        }
      }
    }

    if (refreshToken) {
      const decodedRefresh = jwt.decode(refreshToken);
      if (decodedRefresh && decodedRefresh.jti) {
        await client.del(`refresh:${decodedRefresh.jti}`);
      }
    }

    await User.updateOne({ _id: req.user }, { $inc: { tokenVersion: 1 } });
    logger.info("auth_logout", { userId: req.user.toString() });
    clearRefreshCookie(res);

    return res.json({ message: "Logged out" });
  } catch (error) {
    logger.error("auth_logout_error", { message: error.message, stack: error.stack });
    return res.status(500).json({ message: "Logout failed" });
  }
};

module.exports = {
  handleSignUp,
  handleOtpverify,
  handleCheckAuth,
  handleLogIn,
  handleRefreshToken,
  handleLogout,
};
