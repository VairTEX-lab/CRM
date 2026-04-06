# CRM API

This Express API exposes CRUD routes for:

- `GET /companies`
- `GET /companies/:id`
- `POST /companies`
- `PUT /companies/:id`
- `DELETE /companies/:id`
- `GET /contacts`
- `GET /contacts/:id`
- `POST /contacts`
- `PUT /contacts/:id`
- `DELETE /contacts/:id`
- `GET /deals`
- `GET /deals/:id`
- `POST /deals`
- `PUT /deals/:id`
- `PATCH /deals/:id/stage`
- `DELETE /deals/:id`

## Setup

1. Install Node.js.
2. Run `npm install`.
3. Create a `.env` file or set environment variables from [.env.example](C:\Users\carri\.codex\.env.example).
4. Apply [crm_schema.sql](C:\Users\carri\.codex\crm_schema.sql) to your PostgreSQL database.
5. Start the API with `npm start`.
6. For the frontend, create `crm-frontend/.env` from [crm-frontend/.env.example](C:\Users\carri\.codex\crm-frontend\.env.example).

## Database connection

This backend connects to PostgreSQL in [src/db.js](C:\Users\carri\.codex\src\db.js) using the `DATABASE_URL` environment variable.

Example:

`postgresql://postgres:postgres@localhost:5432/crm`

The frontend connects to the API using `VITE_API_BASE_URL`.

Example:

`VITE_API_BASE_URL=http://localhost:3000`

For deployment, this value should point to your hosted backend URL, for example:

`VITE_API_BASE_URL=https://your-crm-api.onrender.com`

## Authentication

This CRM now requires sign-in before the frontend can access the API.

Backend auth environment variables:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `AUTH_SECRET`

Local default credentials, if you have not set env vars yet:

- email: `admin@vairtexcrm.local`
- password: `ChangeMe123!`

Before sharing this CRM with employees, replace those defaults with your own secure values.

This project is currently wired for PostgreSQL, not MongoDB. If you want MongoDB later, we would replace the database layer and change the queries.

## Pipeline logic

Use `PATCH /deals/:id/stage` to move a deal through the pipeline.

Request body:

```json
{
  "stage": "Proposal",
  "next_step": "Send formal pricing proposal"
}
```

This route:

- validates the stage value
- optionally updates `next_step`
- automatically updates the deal `updated_at` timestamp

## Notes

- `contacts.email` must be unique.
- `deals.next_step` must never be empty.
- `deals.close_probability` is stored as a percentage from `0` to `100`.
- Allowed deal stages are `Lead`, `Qualified`, `Proposal`, `Negotiation`, `Won`, and `Lost`.
