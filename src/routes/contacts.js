const express = require("express");
const db = require("../db");
const { badRequest, notFound } = require("../utils/http");
const {
  isBlank,
  normalizeNullableString,
  requireFields
} = require("../utils/validation");

const router = express.Router();

function normalizeContactNames(firstName, lastName, phone) {
  const safeFirstName = String(firstName || "").trim();
  const safeLastName = String(lastName || "").trim();
  const safePhone = String(phone || "").trim();

  if (safeFirstName && safeLastName) {
    return { firstName: safeFirstName, lastName: safeLastName };
  }

  if (safeFirstName && !safeLastName) {
    return { firstName: safeFirstName, lastName: "Contact" };
  }

  if (!safeFirstName && safeLastName) {
    return { firstName: safeLastName, lastName: "Contact" };
  }

  if (safePhone) {
    return { firstName: "Phone", lastName: "Contact" };
  }

  return { firstName: "Unknown", lastName: "Contact" };
}

router.get("/", async (_req, res, next) => {
  try {
    const result = await db.query(
      `SELECT *
       FROM contacts
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
       FROM contacts
       WHERE id = $1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      throw notFound("Contact");
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  const {
    company_id,
    tag,
    first_name,
    last_name,
    title,
    email,
    phone,
    linkedin_url,
    last_contacted,
    notes
  } = req.body;

  const hasMeaningfulContactData =
    !isBlank(first_name) ||
    !isBlank(last_name) ||
    !isBlank(email) ||
    !isBlank(phone) ||
    !isBlank(title);

  if (!hasMeaningfulContactData) {
    return next(badRequest("A contact needs at least a name, phone, email, or title"));
  }

  const normalizedNames = normalizeContactNames(first_name, last_name, phone);

  try {
    const result = await db.query(
      `INSERT INTO contacts (
         company_id, tag, first_name, last_name, title, email,
         phone, linkedin_url, last_contacted, notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        company_id ?? null,
        normalizeNullableString(tag),
        normalizedNames.firstName,
        normalizedNames.lastName,
        normalizeNullableString(title),
        normalizeNullableString(email)
          ? String(email).trim().toLowerCase()
          : null,
        normalizeNullableString(phone),
        normalizeNullableString(linkedin_url),
        last_contacted || null,
        normalizeNullableString(notes)
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return next(badRequest("A contact with that email already exists"));
    }

    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  const {
    company_id,
    tag,
    first_name,
    last_name,
    title,
    email,
    phone,
    linkedin_url,
    last_contacted,
    notes
  } = req.body;

  const hasMeaningfulContactData =
    !isBlank(first_name) ||
    !isBlank(last_name) ||
    !isBlank(email) ||
    !isBlank(phone) ||
    !isBlank(title);

  if (!hasMeaningfulContactData) {
    return next(badRequest("A contact needs at least a name, phone, email, or title"));
  }

  const normalizedNames = normalizeContactNames(first_name, last_name, phone);

  try {
    const result = await db.query(
      `UPDATE contacts
       SET company_id = $1,
           tag = $2,
           first_name = $3,
           last_name = $4,
           title = $5,
           email = $6,
           phone = $7,
           linkedin_url = $8,
           last_contacted = $9,
           notes = $10,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [
        company_id ?? null,
        normalizeNullableString(tag),
        normalizedNames.firstName,
        normalizedNames.lastName,
        normalizeNullableString(title),
        normalizeNullableString(email)
          ? String(email).trim().toLowerCase()
          : null,
        normalizeNullableString(phone),
        normalizeNullableString(linkedin_url),
        last_contacted || null,
        normalizeNullableString(notes),
        req.params.id
      ]
    );

    if (result.rowCount === 0) {
      throw notFound("Contact");
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return next(badRequest("A contact with that email already exists"));
    }

    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const result = await db.query(
      `DELETE FROM contacts
       WHERE id = $1
       RETURNING id`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      throw notFound("Contact");
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
