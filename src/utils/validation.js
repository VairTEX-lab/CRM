const DEAL_STAGES = [
  "Lead",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost"
];

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function normalizeNullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

function requireFields(payload, fields) {
  const missing = fields.filter((field) => isBlank(payload[field]));
  return missing;
}

function validateDealStage(stage) {
  return DEAL_STAGES.includes(stage);
}

module.exports = {
  DEAL_STAGES,
  isBlank,
  normalizeNullableString,
  requireFields,
  validateDealStage
};
