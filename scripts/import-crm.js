const path = require("path");
const XLSX = require("xlsx");
const db = require("../src/db");

const workbookPath =
  process.argv[2] ||
  path.resolve(
    "C:\\Users\\carri\\Downloads\\VairTEX Customer Relationship Management (1).xlsx"
  );

function readSheet(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return [];
  }

  return XLSX.utils.sheet_to_json(sheet, {
    range: 2,
    defval: "",
    raw: false
  }).filter((row) =>
    Object.values(row).some((value) => normalize(value) !== null)
  );
}

function normalize(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

function splitName(fullName) {
  const cleaned = normalize(fullName);
  if (!cleaned) {
    return { firstName: "Unknown", lastName: "Contact" };
  }

  const digitCount = cleaned.replace(/\D/g, "").length;
  const looksPhoneLike =
    digitCount >= 7 &&
    (!/[A-Za-z]/.test(cleaned) ||
      /\b(phone|cell|mobile|direct|office|corporate|contact)\b/i.test(cleaned));

  if (looksPhoneLike) {
    return { firstName: "", lastName: "" };
  }

  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "Contact" };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1]
  };
}

function normalizeProbability(value) {
  const normalized = normalize(value);
  if (normalized === null) {
    return null;
  }

  const numeric = Number(normalized);
  if (Number.isNaN(numeric)) {
    return null;
  }

  if (numeric > 100 && numeric <= 10000) {
    return numeric / 100;
  }

  if (numeric > 0 && numeric < 1) {
    return numeric * 100;
  }

  return numeric;
}

function makeContactKey(companyName, contactName) {
  return `${companyName || "NO_COMPANY"}::${contactName}`;
}

function makeDealKey({ sourceName, companyName, contactName, dealName }) {
  return [
    sourceName || "",
    companyName || "",
    contactName || "",
    dealName || ""
  ].join("::");
}

async function loadExistingCompanies(companyIds) {
  const result = await db.query(`SELECT id, name FROM companies`);
  for (const row of result.rows) {
    companyIds.set(row.name, row.id);
  }
}

async function loadExistingContacts(contactIds) {
  const result = await db.query(
    `SELECT
       c.id,
       co.name AS company_name,
       c.first_name,
       c.last_name
     FROM contacts c
     LEFT JOIN companies co ON co.id = c.company_id`
  );

  for (const row of result.rows) {
    const fullName = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
    contactIds.set(makeContactKey(row.company_name, fullName), row.id);
  }
}

async function loadExistingDeals(existingDealKeys) {
  const result = await db.query(
    `SELECT
       d.deal_name,
       d.source,
       co.name AS company_name,
       ct.first_name,
       ct.last_name
     FROM deals d
     LEFT JOIN companies co ON co.id = d.company_id
     LEFT JOIN contacts ct ON ct.id = d.contact_id`
  );

  for (const row of result.rows) {
    const contactName = [row.first_name, row.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || null;
    existingDealKeys.add(
      makeDealKey({
        sourceName: row.source,
        companyName: row.company_name,
        contactName,
        dealName: row.deal_name
      })
    );
  }
}

async function upsertCompany(row, companyIds) {
  const name = normalize(row["Company Name"] || row["Company"]);
  if (!name) {
    return null;
  }

  if (companyIds.has(name)) {
    return companyIds.get(name);
  }

  const result = await db.query(
    `INSERT INTO companies (
       name, industry, location, work_phone, hvac_score, site_count,
       priority, status, primary_contact_name, assignee, notes
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (name) DO UPDATE
     SET industry = COALESCE(EXCLUDED.industry, companies.industry),
         location = COALESCE(EXCLUDED.location, companies.location),
         work_phone = COALESCE(EXCLUDED.work_phone, companies.work_phone),
         hvac_score = COALESCE(EXCLUDED.hvac_score, companies.hvac_score),
         site_count = COALESCE(EXCLUDED.site_count, companies.site_count),
         priority = COALESCE(EXCLUDED.priority, companies.priority),
         status = COALESCE(EXCLUDED.status, companies.status),
         primary_contact_name = COALESCE(EXCLUDED.primary_contact_name, companies.primary_contact_name),
         assignee = COALESCE(EXCLUDED.assignee, companies.assignee),
         notes = COALESCE(EXCLUDED.notes, companies.notes),
         updated_at = CURRENT_TIMESTAMP
     RETURNING id`,
    [
      name,
      normalize(row["Industry"]),
      normalize(row["Location"]),
      normalize(row["Work Phone"]),
      normalize(row["HVAC Score (1-10)"])
        ? Number(row["HVAC Score (1-10)"])
        : null,
      normalize(row["# of Sites"]) ? Number(row["# of Sites"]) : null,
      normalize(row["Priority"]),
      normalize(row["Status"]),
      normalize(row["Contact Name/Title"]),
      normalize(row["Assignee"] || row["Owner"]),
      normalize(row["Notes"] || row["Description"])
    ]
  );

  let id = result.rows[0]?.id;
  if (!id) {
    const existing = await db.query(
      `SELECT id FROM companies WHERE name = $1`,
      [name]
    );
    id = existing.rows[0]?.id;
  }

  if (id) {
    companyIds.set(name, id);
  }

  return id || null;
}

async function upsertContact(row, companyIds, contactIds, issues) {
  const companyName = normalize(row["Company"]);
  const contactName = normalize(row["Name"] || row["Contact Name"]);
  const companyId = companyName ? companyIds.get(companyName) : null;

  if (!contactName) {
    return null;
  }

  const email = normalize(row["Email"]);
  const key = makeContactKey(companyName, contactName);
  if (contactIds.has(key)) {
    return contactIds.get(key);
  }

  const { firstName, lastName } = splitName(contactName);
  const fallbackPhone =
    normalize(row["Phone"]) ||
    (contactName.replace(/\D/g, "").length >= 7 ? contactName : null);

  try {
    const result = await db.query(
      `INSERT INTO contacts (
         company_id, tag, first_name, last_name, title, email,
         phone, linkedin_url, last_contacted, notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (email) DO UPDATE
       SET company_id = COALESCE(EXCLUDED.company_id, contacts.company_id),
           tag = COALESCE(EXCLUDED.tag, contacts.tag),
           title = COALESCE(EXCLUDED.title, contacts.title),
           phone = COALESCE(EXCLUDED.phone, contacts.phone),
           linkedin_url = COALESCE(EXCLUDED.linkedin_url, contacts.linkedin_url),
           last_contacted = COALESCE(EXCLUDED.last_contacted, contacts.last_contacted),
           notes = COALESCE(EXCLUDED.notes, contacts.notes),
           updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [
        companyId,
        normalize(row["Tag"]),
        firstName,
        lastName,
        normalize(row["Title"]),
        email ? email.toLowerCase() : null,
        fallbackPhone,
        normalize(row["LinkedIn"]),
        normalize(row["Last Contacted"]) || null,
        normalize(row["Notes"])
      ]
    );

    const id = result.rows[0]?.id || null;
    if (id) {
      contactIds.set(key, id);
    }
    return id;
  } catch (error) {
    issues.push({
      type: "contact",
      companyName,
      contactName,
      reason: error.message
    });
    return null;
  }
}

async function insertDeal(
  row,
  companyIds,
  contactIds,
  existingDealKeys,
  issues,
  sourceName
) {
  const companyName = normalize(row["Company"]);
  const dealName = normalize(row["Deal Name"] || row["Name"]);
  if (!dealName) {
    return;
  }

  const companyId = companyName ? companyIds.get(companyName) : null;
  const contactName = normalize(row["Contact Name"]);
  const contactId = contactName
    ? contactIds.get(makeContactKey(companyName, contactName)) || null
    : null;
  const dealKey = makeDealKey({
    sourceName,
    companyName,
    contactName,
    dealName
  });

  if (existingDealKeys.has(dealKey)) {
    return;
  }

  const nextStep =
    normalize(row["Next Step"]) || "Follow up with contact";
  const stage = normalize(row["Stage"]) || "Lead";

  try {
    await db.query(
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
       )`,
      [
        companyId,
        contactId,
        dealName,
        ["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"].includes(
          stage
        )
          ? stage
          : "Lead",
        normalize(row["Deal Value"] || row["Value"])
          ? Number(row["Deal Value"] || row["Value"])
          : 0,
        normalizeProbability(row["Close Probability"] || row["Win %"]),
        normalize(row["Operational Impact Statement"]),
        normalize(row["Financial Impact"]),
        normalize(row["Failure Mode"]),
        normalize(row["Close Date"]),
        normalize(row["Last Activity"]),
        nextStep,
        normalize(row["Owner"]),
        normalize(row["Status"]) || "Open",
        normalize(row["Loss Reason"]),
        normalize(row["Priority"]),
        sourceName,
        normalize(row["Description"])
      ]
    );
    existingDealKeys.add(dealKey);
  } catch (error) {
    issues.push({
      type: "deal",
      companyName,
      dealName,
      reason: error.message
    });
  }
}

async function main() {
  console.log(`Importing workbook: ${workbookPath}`);

  const workbook = XLSX.readFile(workbookPath);
  const companiesRows = readSheet(workbook, "Companies");
  const contactsRows = readSheet(workbook, "Contacts");
  const pipelineRows = readSheet(workbook, "Pipeline");
  const opportunitiesRows = readSheet(workbook, "Opportunities");

  const companyIds = new Map();
  const contactIds = new Map();
  const existingDealKeys = new Set();
  const issues = [];

  await loadExistingCompanies(companyIds);
  await loadExistingContacts(contactIds);
  await loadExistingDeals(existingDealKeys);

  for (const row of companiesRows) {
    await upsertCompany(row, companyIds);
  }

  for (const row of contactsRows) {
    if (normalize(row["Company"]) && !companyIds.has(normalize(row["Company"]))) {
      await upsertCompany({ Company: row["Company"] }, companyIds);
    }
    await upsertContact(row, companyIds, contactIds, issues);
  }

  for (const row of pipelineRows) {
    if (normalize(row["Company"]) && !companyIds.has(normalize(row["Company"]))) {
      await upsertCompany({ Company: row["Company"], Owner: row["Owner"] }, companyIds);
    }
    if (normalize(row["Contact Name"])) {
      await upsertContact(
        {
          Company: row["Company"],
          Name: row["Contact Name"],
          Notes: row["Next Step"]
        },
        companyIds,
        contactIds,
        issues
      );
    }
    await insertDeal(
      row,
      companyIds,
      contactIds,
      existingDealKeys,
      issues,
      "Pipeline"
    );
  }

  for (const row of opportunitiesRows) {
    if (normalize(row["Company"]) && !companyIds.has(normalize(row["Company"]))) {
      await upsertCompany({ Company: row["Company"] }, companyIds);
    }
    await insertDeal(
      row,
      companyIds,
      contactIds,
      existingDealKeys,
      issues,
      "Opportunities"
    );
  }

  console.log(`Imported companies: ${companyIds.size}`);
  console.log(`Imported contacts: ${contactIds.size}`);
  console.log(`Import issues: ${issues.length}`);

  if (issues.length > 0) {
    console.log("First few issues:");
    for (const issue of issues.slice(0, 10)) {
      console.log(issue);
    }
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});
