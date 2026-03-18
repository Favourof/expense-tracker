const jwt = require("jsonwebtoken");
const { getRedisClient } = require("../utils/redisClient");
const env = require("../../config/env");

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing or invalid token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, env.JWT_SECRET);

    if (decoded.type !== "access") {
      return res.status(401).json({ message: "Invalid token type" });
    }

    const client = await getRedisClient();
    if (decoded.jti) {
      const blacklisted = await client.get(`bl:${decoded.jti}`);
      if (blacklisted) {
        return res.status(401).json({ message: "Token is blacklisted" });
      }
    }

    req.user = decoded.id;
    req.tokenJti = decoded.jti || null;
    next();
  } catch (error) {
    console.log(error);

    res.status(401).json({ message: "Invalid token " });
  }
};

module.exports = { verifyToken };
