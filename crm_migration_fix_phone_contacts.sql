BEGIN;

WITH normalized_contacts AS (
  SELECT
    id,
    company_id,
    first_name,
    last_name,
    phone,
    trim(concat_ws(' ', nullif(first_name, ''), nullif(last_name, ''))) AS combined_name,
    regexp_replace(trim(concat_ws(' ', nullif(first_name, ''), nullif(last_name, ''))), '\D', '', 'g') AS combined_digits
  FROM contacts
),
phone_like_contacts AS (
  SELECT
    id,
    CASE
      WHEN nullif(trim(phone), '') IS NOT NULL THEN trim(phone)
      WHEN nullif(trim(first_name), '') IS NOT NULL AND nullif(trim(last_name), '') IS NOT NULL
        THEN trim(first_name) || ' ' || trim(last_name)
      ELSE trim(combined_name)
    END AS recovered_phone
  FROM normalized_contacts
  WHERE
    (
      length(combined_digits) >= 7
      AND (
        combined_name !~ '[A-Za-z]'
        OR combined_name ~* '\m(phone|cell|mobile|direct|office|corporate|contact)\M'
      )
    )
    OR (
      nullif(trim(first_name), '') IS NOT NULL
      AND nullif(trim(last_name), '') IS NULL
      AND (
        length(regexp_replace(trim(first_name), '\D', '', 'g')) >= 7
        OR trim(first_name) ~* '\m(phone|cell|mobile|direct|office|corporate|contact)\M'
      )
    )
    OR (
      nullif(trim(last_name), '') IS NOT NULL
      AND nullif(trim(first_name), '') IS NULL
      AND (
        length(regexp_replace(trim(last_name), '\D', '', 'g')) >= 7
        OR trim(last_name) ~* '\m(phone|cell|mobile|direct|office|corporate|contact)\M'
      )
    )
)
UPDATE contacts c
SET
  phone = COALESCE(NULLIF(trim(c.phone), ''), plc.recovered_phone),
  first_name = '',
  last_name = '',
  updated_at = CURRENT_TIMESTAMP
FROM phone_like_contacts plc
WHERE c.id = plc.id;

COMMIT;
