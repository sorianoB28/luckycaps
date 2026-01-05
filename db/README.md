# Database Migrations

This project uses Netlify Neon Postgres.

SQL migrations live in `db/migrations/`. They are written to be safe to re-run (idempotent) where possible.

To apply a migration, run the SQL against your Neon database (Netlify database) using your preferred Postgres client.

