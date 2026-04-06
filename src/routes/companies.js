const express = require("express");
const db = require("../db");
const { badRequest, notFound } = require("../utils/http");
const { isBlank, normalizeNullableString } = require("../utils/validation");

const router = express.Router();

router.get("/", async (_req, res, next) => {
  try {
    const result = await db.query(
      `SELECT *
       FROM companies
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
       FROM companies
       WHERE id = $1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      throw notFound("Company");
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  const {
    name,
    industry,
    location,
    work_phone,
    hvac_score,
    site_count,
    priority,
    status,
    primary_contact_name,
    primary_contact_title,
    assignee,
    notes
  } = req.body;

  if (isBlank(name)) {
    return next(badRequest("`name` is required"));
  }

  try {
    const result = await db.query(
      `INSERT INTO companies (
         name, industry, location, work_phone, hvac_score, site_count,
         priority, status, primary_contact_name, primary_contact_title,
         assignee, notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        String(name).trim(),
        normalizeNullableString(industry),
        normalizeNullableString(location),
        normalizeNullableString(work_phone),
        hvac_score ?? null,
        site_count ?? null,
        normalizeNullableString(priority),
        normalizeNullableString(status),
        normalizeNullableString(primary_contact_name),
        normalizeNullableString(primary_contact_title),
        normalizeNullableString(assignee),
        normalizeNullableString(notes)
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  const {
    name,
    industry,
    location,
    work_phone,
    hvac_score,
    site_count,
    priority,
    status,
    primary_contact_name,
    primary_contact_title,
    assignee,
    notes
  } = req.body;

  if (isBlank(name)) {
    return next(badRequest("`name` is required"));
  }

  try {
    const result = await db.query(
      `UPDATE companies
       SET name = $1,
           industry = $2,
           location = $3,
           work_phone = $4,
           hvac_score = $5,
           site_count = $6,
           priority = $7,
           status = $8,
           primary_contact_name = $9,
           primary_contact_title = $10,
           assignee = $11,
           notes = $12,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $13
       RETURNING *`,
      [
        String(name).trim(),
        normalizeNullableString(industry),
        normalizeNullableString(location),
        normalizeNullableString(work_phone),
        hvac_score ?? null,
        site_count ?? null,
        normalizeNullableString(priority),
        normalizeNullableString(status),
        normalizeNullableString(primary_contact_name),
        normalizeNullableString(primary_contact_title),
        normalizeNullableString(assignee),
        normalizeNullableString(notes),
        req.params.id
      ]
    );

    if (result.rowCount === 0) {
      throw notFound("Company");
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const result = await db.query(
      `DELETE FROM companies
       WHERE id = $1
       RETURNING id`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      throw notFound("Company");
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
