# Cadence — Automatic Timetable Generator

Cadence turns a department's courses, lecturers, rooms and cohorts into a
**conflict-free, balanced weekly lecture timetable** in seconds. Built as an
undergraduate project for the University of Jos.

- **Author:** Adetunji Oluwatimilehin Solomon — UJ/2022/NS/0184
- **Department:** Computer Science, University of Jos
- **Supervisor:** Dr. Oyeyinka Oyerinde

## What it does

An admin describes the department (courses, lecturers with availability, rooms,
student cohorts and the weekly grid), and the **Cadence Engine** produces a timetable
that never double-books a lecturer, room or cohort, respects room capacity/type and
lecturer availability, keeps the lunch break clear — then optimizes the schedule for
compact, balanced days. Timetables can be **published to a public link** that anyone
can filter (by cohort, lecturer or room), print, or export to CSV.

## The engine (`src/lib/scheduler/`)

Timetabling is a classic NP-hard constraint-satisfaction problem. Cadence solves it in
two phases and is fully **deterministic** (same input + seed ⇒ same timetable):

1. **Constructive graph-colouring** — expands each course into weekly meetings, orders
   them *most-constrained-first*, and greedily places each in the feasible slot that
   adds the least soft cost. Guarantees **zero hard-constraint violations** among placed
   classes; anything that can't fit is reported **unplaced with a human-readable reason**.
2. **Simulated annealing** — moves/swaps placed classes (hard feasibility always
   preserved) to minimize a weighted soft penalty: cohort gaps, course spread across the
   week, lecturer compactness, and edge-of-day load.

Run the engine's self-check (no database needed):

```bash
npm run verify:engine
```

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Prisma 6
(SQLite locally, PostgreSQL in production) · hand-rolled `jose` JWT auth.

## Local development

```bash
npm install
npm run db:push      # create the SQLite schema
npm run db:seed      # realistic UNIJOS Computer Science demo + one published timetable
npm run dev
```

Demo login: **admin@cadence.edu / password123**
Public timetable: **/t/csc-first-semester**

`npm run db:reset` wipes and reseeds.

## Deployment (Vercel + Neon Postgres)

Prisma's datasource `provider` can't be an env var, so `scripts/db-provider.mjs` sets it
from `DATABASE_URL` during `postinstall`/`prebuild`. On the host set:

- `DATABASE_URL` — the **pooled** Neon URL, e.g.
  `postgresql://…-pooler…/cadence?sslmode=require&pgbouncer=true` (no surrounding quotes)
- `DATABASE_PROVIDER=postgresql`
- `AUTH_SECRET` — a fresh 32-byte hex secret

Then push the schema and seed against the **direct** (non-pooled) Neon URL once:

```bash
DATABASE_URL="postgresql://…(direct)…/cadence?sslmode=require" npm run db:push
DATABASE_URL="postgresql://…(direct)…/cadence?sslmode=require" npm run db:seed
```
