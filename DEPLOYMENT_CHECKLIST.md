# VairTEX CRM Deployment Checklist

## 1. Install Git

This machine currently does not have `git` available in the terminal, so GitHub setup cannot be completed until Git is installed.

After installing Git, verify with:

```powershell
git --version
```

## 2. Create a GitHub repository

Suggested repository name:

- `vairtex-crm`

## 3. Push this project to GitHub

From `C:\Users\carri\.codex`:

```powershell
git init
git add .
git commit -m "Initial VairTEX CRM"
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

## 4. Deploy on Render

This project includes [render.yaml](C:\Users\carri\.codex\render.yaml) for:

- Render Postgres database
- Render backend web service
- Render frontend static site

In Render:

1. Create a new Blueprint from your GitHub repo.
2. Confirm the three resources in `render.yaml`.
3. Enter these required secret values when prompted:
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
4. Set the frontend env var manually after the backend is created:
   - `VITE_API_BASE_URL=https://<your-backend-name>.onrender.com`

## 5. Run the database schema

After the Render Postgres database is ready, apply:

- [crm_schema.sql](C:\Users\carri\.codex\crm_schema.sql)
- then your migration files if needed

## 6. Verify the live app

Check:

- backend health endpoint
- frontend login screen
- sign-in works
- companies, contacts, deals, and leads inbox all load

## 7. Share with your business partner

Once the Render frontend URL is live, you can send that link to your partner for testing.
