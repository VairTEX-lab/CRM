const express = require("express");
const db = require("../db");
const { badRequest, notFound } = require("../utils/http");
const {
  DEAL_STAGES,
  isBlank,
  normalizeNullableString,
  requireFields,
  validateDealStage
} = require("../utils/validation");

const router = express.Router();

router.get("/", async (_req, res, next) => {
  try {
    const result = await db.query(
      `SELECT *
       FROM deals
       ORDER BY id`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT *
       FROM deals
       WHERE id = $1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      throw notFound("Deal");
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  const {
    company_id,
    contact_id,
    deal_name,
    stage,
    deal_value,
    close_probability,
    operational_impact_statement,
    financial_impact,
    failure_mode,
    expected_close_date,
    last_activity,
    next_step,
    owner,
    status,
    loss_reason,
    priority,
    source,
    description
  } = req.body;

  const missingFields = requireFields(req.body, ["deal_name", "stage", "next_step"]);
  if (missingFields.length > 0) {
    return next(badRequest("`deal_name`, `stage`, and a non-empty `next_step` are required"));
  }

  if (!validateDealStage(stage)) {
    return next(badRequest(`\`stage\` must be one of: ${DEAL_STAGES.join(", ")}`));
  }

  try {
    const result = await db.query(
      `INSERT INTO deals (
         company_id, contact_id, deal_name, stage, deal_value, close_probability,
         operational_impact_statement, financial_impact, failure_mode,
         expected_close_date, last_activity, next_step, owner, status,
         loss_reason, priority, source, description
       )
       VALUES (
         $1, $2, $3, $4, $5, $6,
         $7, $8, $9,
         $10, $11, $12, $13, $14,
         $15, $16, $17, $18
       )
       RETURNING *`,
      [
        company_id ?? null,
        contact_id ?? null,
        String(deal_name).trim(),
        String(stage).trim(),
        deal_value ?? 0,
        close_probability ?? null,
        normalizeNullableString(operational_impact_statement),
        normalizeNullableString(financial_impact),
        normalizeNullableString(failure_mode),
        expected_close_date || null,
        normalizeNullableString(last_activity),
        String(next_step).trim(),
        normalizeNullableString(owner),
        normalizeNullableString(status),
        normalizeNullableString(loss_reason),
        normalizeNullableString(priority),
        normalizeNullableString(source),
        normalizeNullableString(description)
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  const {
    company_id,
    contact_id,
    deal_name,
    stage,
    deal_value,
    close_probability,
    operational_impact_statement,
    financial_impact,
    failure_mode,
    expected_close_date,
    last_activity,
    next_step,
    owner,
    status,
    loss_reason,
    priority,
    source,
    description
  } = req.body;

  const missingFields = requireFields(req.body, ["deal_name", "stage", "next_step"]);
  if (missingFields.length > 0) {
    return next(badRequest("`deal_name`, `stage`, and a non-empty `next_step` are required"));
  }

  if (!validateDealStage(stage)) {
    return next(badRequest(`\`stage\` must be one of: ${DEAL_STAGES.join(", ")}`));
  }

  try {
    const result = await db.query(
      `UPDATE deals
       SET company_id = $1,
           contact_id = $2,
           deal_name = $3,
           stage = $4,
           deal_value = $5,
           close_probability = $6,
           operational_impact_statement = $7,
           financial_impact = $8,
           failure_mode = $9,
           expected_close_date = $10,
           last_activity = $11,
           next_step = $12,
           owner = $13,
           status = $14,
           loss_reason = $15,
           priority = $16,
           source = $17,
           description = $18,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $19
       RETURNING *`,
      [
        company_id ?? null,
        contact_id ?? null,
        String(deal_name).trim(),
        String(stage).trim(),
        deal_value ?? 0,
        close_probability ?? null,
        normalizeNullableString(operational_impact_statement),
        normalizeNullableString(financial_impact),
        normalizeNullableString(failure_mode),
        expected_close_date || null,
        normalizeNullableString(last_activity),
        String(next_step).trim(),
        normalizeNullableString(owner),
        normalizeNullableString(status),
        normalizeNullableString(loss_reason),
        normalizeNullableString(priority),
        normalizeNullableString(source),
        normalizeNullableString(description),
        req.params.id
      ]
    );

    if (result.rowCount === 0) {
      throw notFound("Deal");
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/stage", async (req, res, next) => {
  const { stage, next_step } = req.body;

  if (isBlank(stage)) {
    return next(badRequest("`stage` is required"));
  }

  if (!validateDealStage(stage)) {
    return next(badRequest(`\`stage\` must be one of: ${DEAL_STAGES.join(", ")}`));
  }

  if (next_step !== undefined && isBlank(next_step)) {
    return next(badRequest("`next_step` cannot be empty when provided"));
  }

  try {
    const result = await db.query(
      `UPDATE deals
       SET stage = $1,
           next_step = COALESCE($2, next_step),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [
        String(stage).trim(),
        next_step === undefined ? null : String(next_step).trim(),
        req.params.id
      ]
    );

    if (result.rowCount === 0) {
      throw notFound("Deal");
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const result = await db.query(
      `DELETE FROM deals
       WHERE id = $1
       RETURNING id`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      throw notFound("Deal");
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
