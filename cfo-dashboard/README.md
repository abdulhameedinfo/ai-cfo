# AI CFO Dashboard

Prototype AI CFO dashboard for a robotic imaging enterprise. The app models Organizations → Projects → Revenue/Expenses in Supabase, surfaces financial KPIs, and integrates Gemini tool-calling for analysis, forecasting, and auditing.

## Architecture Overview

- **Supabase**: relational data store with views for `org_financials`, `project_financials`, `monthly_travel_costs`, and `expense_anomalies`.
- **Next.js App Router**: server-side data loading for KPIs and org/project hierarchy.
- **Gemini AI CFO**: tool-routed functions query Supabase for margin, trend, and audit analysis.

## Setup

1. Create the base tables in Supabase (from the assessment prompt).
2. Run the view definitions in [supabase/views.sql](./supabase/views.sql).
3. Seed data using the provided script.
4. Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

5. Add values:

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
GEMINI_MODEL=...
```

6. Install dependencies and run:

```bash
npm install
npm run seed
npm run dev
```

## Reviewer Setup (Quick Start)

1. Copy `.env.example` → `.env.local`, then fill in:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL` (use `models/gemini-pro-latest` or `models/gemini-flash-latest`)
2. Run `supabase/views.sql` in the Supabase SQL editor after creating base tables.
3. Run:
   ```bash
   npm install
   npm run seed
   npm run dev
   ```

## Viewing Data

- Tables: open Supabase Table Editor and select `organizations`, `projects`, `revenue`, or `expenses`.
- Views: run `select * from project_financials;` (and `org_financials`, `monthly_travel_costs`, `expense_anomalies`) in the Supabase SQL Editor.

## AI CFO Tools

- `get_org_profit_margin`: net margin by organization.
- `get_travel_cost_trend`: average travel cost per survey over time + projected quarterly run-rate.
- `audit_expenses_last_year`: duplicate flight billing + large equipment purchase detection.

## AI Orchestration (Short)

The AI CFO uses tool calling instead of embedding raw data in prompts. The model selects a tool, the server queries Supabase views, and only the minimal aggregate results are sent back to the model. This scales cleanly, keeps tokens low, and avoids exposing raw tables to the LLM.


## Deployment

Deploy with Vercel or Railway. Ensure env variables SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, GEMINI_MODEL are set on the host.
