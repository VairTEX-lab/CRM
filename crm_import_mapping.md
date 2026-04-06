# CRM Import Mapping

This mapping shows how the workbook tabs fit into the SQL schema in [crm_schema.sql](C:\Users\carri\.codex\crm_schema.sql).

## Companies tab -> `companies`

`Company Name` -> `name`

`Industry` -> `industry`

`Location` -> `location`

`Work Phone` -> `work_phone`

`HVAC Score (1-10)` -> `hvac_score`

`# of Sites` -> `site_count`

`Priority` -> `priority`

`Status` -> `status`

`Contact Name/Title` -> split into `primary_contact_name` and `primary_contact_title` if possible; otherwise store the full value in `primary_contact_name`

`Assignee` -> `assignee`

`Notes` -> `notes`

## Contacts tab -> `contacts`

`Company` -> lookup `companies.id`, then store as `company_id`

`Tag` -> `tag`

`Name` -> split into `first_name` and `last_name`

`Title` -> `title`

`Email` -> `email`

`Phone` -> `phone`

`LinkedIn` -> `linkedin_url`

`Last Contacted` -> `last_contacted`

`Notes` -> `notes`

Important: `contacts.email` is unique. If an imported row has a duplicate email, it must be merged or skipped.

## Pipeline tab -> `deals`

`Company` -> lookup `companies.id`, then store as `company_id`

`Contact Name` -> lookup the contact row, then store as `contact_id`

`Deal Name` -> `deal_name`

`Stage` -> `stage`

`Deal Value` -> `deal_value`

`Close Probability` -> `close_probability`

`Last Activity` -> `last_activity`

`Next Step` -> `next_step`

`Owner` -> `owner`

Important: `next_step` must never be empty in the database. Blank spreadsheet values should be replaced with a default such as `Follow up with contact`.

## Opportunities tab -> `deals`

This tab can either create additional deal rows or enrich existing rows matched by `deal_name` + `company_id`.

`Name` -> `deal_name`

`Company` -> lookup `companies.id`, then store as `company_id`

`Stage` -> `stage`

`Value` -> `deal_value`

`Close Date` -> `expected_close_date`

`Win %` -> `close_probability`

`Status` -> `status`

`Loss Reason` -> `loss_reason`

`Priority` -> `priority`

`Source` -> `source`

`Description` -> `description`

## New fields to add during import

These are not present as workbook columns yet, but should be populated in the CRM:

`operational_impact_statement`

`financial_impact`

`failure_mode`

If the spreadsheet does not yet contain them, the import can:

1. leave them `NULL` temporarily, or
2. derive them from notes and descriptions, or
3. add new workbook columns before import

Recommended new workbook columns on `Pipeline` or `Opportunities`:

`Operational Impact Statement`

`Financial Impact`

`Failure Mode`

`Close Probability (%)`

`Next Step`
