BEGIN;

-- 1. Merge duplicate companies by exact name.
WITH ranked_companies AS (
    SELECT
        id,
        name,
        MIN(id) OVER (PARTITION BY name) AS keep_id
    FROM companies
),
duplicate_companies AS (
    SELECT id, keep_id
    FROM ranked_companies
    WHERE id <> keep_id
)
UPDATE contacts c
SET company_id = d.keep_id
FROM duplicate_companies d
WHERE c.company_id = d.id;

WITH ranked_companies AS (
    SELECT
        id,
        name,
        MIN(id) OVER (PARTITION BY name) AS keep_id
    FROM companies
),
duplicate_companies AS (
    SELECT id, keep_id
    FROM ranked_companies
    WHERE id <> keep_id
)
UPDATE deals d2
SET company_id = d.keep_id
FROM duplicate_companies d
WHERE d2.company_id = d.id;

WITH ranked_companies AS (
    SELECT
        id,
        name,
        MIN(id) OVER (PARTITION BY name) AS keep_id
    FROM companies
)
DELETE FROM companies c
USING ranked_companies rc
WHERE c.id = rc.id
  AND rc.id <> rc.keep_id;

-- 2. Merge duplicate contacts by company + name + email.
WITH ranked_contacts AS (
    SELECT
        c.id,
        c.company_id,
        c.first_name,
        c.last_name,
        COALESCE(c.email, '') AS email_key,
        MIN(c.id) OVER (
            PARTITION BY c.company_id, c.first_name, c.last_name, COALESCE(c.email, '')
        ) AS keep_id
    FROM contacts c
),
duplicate_contacts AS (
    SELECT id, keep_id
    FROM ranked_contacts
    WHERE id <> keep_id
)
UPDATE deals d
SET contact_id = dc.keep_id
FROM duplicate_contacts dc
WHERE d.contact_id = dc.id;

WITH ranked_contacts AS (
    SELECT
        c.id,
        c.company_id,
        c.first_name,
        c.last_name,
        COALESCE(c.email, '') AS email_key,
        MIN(c.id) OVER (
            PARTITION BY c.company_id, c.first_name, c.last_name, COALESCE(c.email, '')
        ) AS keep_id
    FROM contacts c
)
DELETE FROM contacts c
USING ranked_contacts rc
WHERE c.id = rc.id
  AND rc.id <> rc.keep_id;

-- 3. Remove duplicate imported deals, keeping the earliest row.
WITH ranked_deals AS (
    SELECT
        d.id,
        MIN(d.id) OVER (
            PARTITION BY
                COALESCE(d.company_id, -1),
                COALESCE(d.contact_id, -1),
                d.deal_name,
                COALESCE(d.stage, ''),
                COALESCE(d.deal_value, 0),
                COALESCE(d.close_probability, 0),
                COALESCE(d.next_step, ''),
                COALESCE(d.source, '')
        ) AS keep_id
    FROM deals d
)
DELETE FROM deals d
USING ranked_deals rd
WHERE d.id = rd.id
  AND rd.id <> rd.keep_id;

-- 4. Prevent future duplicate companies by name.
CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_name
ON companies (name);

COMMIT;
