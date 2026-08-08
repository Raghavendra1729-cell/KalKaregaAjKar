# Kal Karega, Aaj Kar

A private, mobile-first PWA with two deliberately separate sections:

- **Study** — prepare tomorrow's plan at night, upload or edit tasks, use optional focus timers, and review dated completion history.
- **Gym** — upload one weekly CSV, preview/edit it, follow warm-up/exercises/stretching with timers and set cues, review the calendar heat map, and save one compressed progress photo per week.

There is no signup. One password from the server environment protects the app.

## Local setup

Requirements: Node.js 20.9+ and Docker.

```bash
cp .env.example .env.local
docker compose up -d
npm install
set -a && source .env.local && set +a && npm run db:migrate
npm run dev
```

Open `http://localhost:3000`. Set a strong `APP_PASSWORD` and a different `SESSION_SECRET` before logging in.

## CSV formats

Copy-ready schemas, rules, null behavior, and complete examples are in [docs/CSV_SCHEMA.md](docs/CSV_SCHEMA.md). Sample files are also available under [`examples/`](examples/).

Every import follows the same safe flow:

1. Choose CSV.
2. Review validation errors and the editable preview.
3. Change any value.
4. Save only when ready.

Gym plans can be loaded and edited again by choosing any date in their week. Study plans remain available by date in History.

## Install and notifications

The app registers `public/sw.js` and includes a web-app manifest. On Android/Chrome, open Settings inside the app and choose **Install app**. On iPhone/Safari, use **Share → Add to Home Screen**.

Session-end sound/vibration works immediately while the app is open. For background nightly/Sunday reminders:

1. Generate keys with `npx web-push generate-vapid-keys`.
2. Put the public/private keys in `.env.local` using the names from `.env.example`.
3. Set `CRON_SECRET`.
4. Call `GET /api/notifications/run` hourly with `Authorization: Bearer <CRON_SECRET>`. `vercel.json` contains the hourly schedule for a future Vercel deployment.

The schedule checks the saved `Asia/Kolkata` reminder times and sends at most one Study and one Gym reminder per eligible day.

## Supabase

For production, replace `DATABASE_URL` with the Supabase Postgres connection string and run `npm run db:migrate`. Progress images are compressed in the browser, capped at 2 MB, and stored as Postgres `bytea`; Cloudinary is not used.

## Verification

```bash
npm test
npm run lint
npm run build
```
