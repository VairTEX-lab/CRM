const crypto = require("crypto");

function getAuthConfig() {
  return {
    email: process.env.ADMIN_EMAIL || "admin@vairtexcrm.local",
    password: process.env.ADMIN_PASSWORD || "ChangeMe123!",
    secret: process.env.AUTH_SECRET || "vairtex-local-dev-secret"
  };
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const normalized = String(value)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, "base64").toString("utf8");
}

function signToken(payload) {
  const { secret } = getAuthConfig();
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  return `${body}.${signature}`;
}

function verifyToken(token) {
  if (!token || !String(token).includes(".")) {
    return null;
  }

  const { secret } = getAuthConfig();
  const [body, providedSignature] = String(token).split(".");
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  if (!safeEqual(providedSignature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(body));

    if (!payload.exp || Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch (_error) {
    return null;
  }
}

module.exports = {
  getAuthConfig,
  safeEqual,
  signToken,
  verifyToken
};
