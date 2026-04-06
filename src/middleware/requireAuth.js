const { unauthorized } = require("../utils/http");
const { verifyToken } = require("../utils/auth");

function requireAuth(req, _res, next) {
  const header = req.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = verifyToken(token);

  if (!payload) {
    return next(unauthorized("Unauthorized"));
  }

  req.user = payload;
  return next();
}

module.exports = requireAuth;
