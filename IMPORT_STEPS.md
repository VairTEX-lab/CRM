# CRM Import Steps

Use these steps to import your original VairTEX workbook into PostgreSQL.

## 1. Stop the backend if it is running

In the backend PowerShell window, press `Ctrl + C`.

## 2. Install the new import dependency

In PowerShell:

```powershell
cd C:\Users\carri\.codex
npm install
```

## 3. Update your database so contacts can exist without email

Open PostgreSQL:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d crm
```

Enter your password when asked.

Then run:

```sql
\i 'C:/Users/carri/.codex/crm_migration_make_contact_email_nullable.sql'
```

You should see:

```text
ALTER TABLE
```

Then exit:

```sql
\q
```

## 4. Set the database connection in PowerShell

```powershell
$env:DATABASE_URL="postgresql://postgres:613015@localhost:5432/crm"
```

## 5. Run the workbook import

```powershell
npm run import:crm -- "C:\Users\carri\Downloads\VairTEX Customer Relationship Management (1).xlsx"
```

## 6. Check the imported data

```powershell
Invoke-RestMethod http://localhost:3000/companies | ConvertTo-Json -Depth 4
Invoke-RestMethod http://localhost:3000/contacts | ConvertTo-Json -Depth 4
Invoke-RestMethod http://localhost:3000/deals | ConvertTo-Json -Depth 4
```

## 7. Restart the backend

```powershell
cd C:\Users\carri\.codex
$env:DATABASE_URL="postgresql://postgres:613015@localhost:5432/crm"
$env:PORT="3000"
npm start
```

## Notes

- Companies are imported from the `Companies` sheet.
- Contacts are imported from the `Contacts` sheet.
- Deals are imported from `Pipeline` and `Opportunities`.
- If `Next Step` is blank, the importer uses `Follow up with contact`.
- Duplicate contact emails are still blocked.
