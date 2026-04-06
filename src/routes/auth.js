const express = require("express");
const { badRequest, unauthorized } = require("../utils/http");
const { getAuthConfig, safeEqual, signToken, verifyToken } = require("../utils/auth");

const router = express.Router();

router.post("/login", (req, res, next) => {
  const { email, password } = req.body || {};
  const config = getAuthConfig();

  if (!email || !password) {
    return next(badRequest("Email and password are required"));
  }

  const emailMatches = safeEqual(String(email).trim().toLowerCase(), config.email.trim().toLowerCase());
  const passwordMatches = safeEqual(password, config.password);

  if (!emailMatches || !passwordMatches) {
    return next(unauthorized("Invalid email or password"));
  }

  const payload = {
    email: config.email,
    role: "admin",
    exp: Date.now() + 1000 * 60 * 60 * 12
  };

  return res.json({
    token: signToken(payload),
    user: {
      email: payload.email,
      role: payload.role
    }
  });
});

router.get("/me", (req, res, next) => {
  const header = req.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = verifyToken(token);

  if (!payload) {
    return next(unauthorized("Unauthorized"));
  }

  return res.json({
    user: {
      email: payload.email,
      role: payload.role
    }
  });
});

module.exports = router;
