---
title: Kal Karega Aaj Kar
emoji: ✅
colorFrom: green
colorTo: orange
sdk: docker
app_port: 7860
pinned: false
---

# Kal Karega, Aaj Kar

A private, installable, mobile-first app with exactly two separate sections:

- **Study** — create one daily plan for any date, usually today in the morning or tomorrow the night before; paste/upload CSV, edit tasks, use optional focus timers, and review date-based history.
- **Gym** — manage one seven-day weekly plan that may start on any date; paste/upload CSV, preview/edit it, run warm-up/exercises/stretching with timers and cues, review the heat map, and save a compressed weekly progress photo.

There is no signup. Protected pages and data APIs require the single password configured in `APP_PASSWORD`. Only the minimal health endpoint and public PWA assets are unauthenticated.

## Local setup

Requirements: Node.js 22 and PostgreSQL (or Docker).

```bash
cp .env.example .env.local
docker compose up -d
npm install
set -a && source .env.local && set +a && npm run db:migrate
npm run dev
```

Open `http://localhost:3000`. Use a strong `APP_PASSWORD`; `SESSION_SECRET` must be a different random value of at least 32 characters.

## Planning and CSV import

Both sections accept a CSV file or CSV pasted directly into the app. Both include **Copy AI prompt**, preview, validation, editable rows, and an explicit save step.

- Gym always needs seven consecutive dates. A rest date is explicit, and the first date can be midweek.
- Study contains one independent date per upload and never becomes a weekly plan.
- Empty optional values stay hidden in the runner/task interface.
- Saved plans can be loaded and edited later.

The exact schema, column meanings, edge cases, and copy-ready examples are in [docs/CSV_SCHEMA.md](docs/CSV_SCHEMA.md). Complete samples are under [`examples/`](examples/).

## Install and notifications

The app includes a manifest and service worker. On Android/Chrome, use **Settings → Install app**; on iPhone/Safari, use **Share → Add to Home Screen**. Timer completion uses the selected vibration, chime, beep, or silent cue while the app is open.

For background reminders:

1. Generate keys with `npx web-push generate-vapid-keys`.
2. Configure `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`.
3. Configure the same `CRON_SECRET` in the app and GitHub Actions.
4. Set the GitHub `APP_URL` variable. `.github/workflows/run-reminders.yml` calls the protected reminder endpoint hourly; the app sends at most one eligible Study and Gym reminder per date.

The service worker never caches password-protected Study or Gym pages.

## Hugging Face Spaces deployment

Create a **Docker Space** and connect Supabase Postgres. A public Space is simplest for scheduled health/reminder calls; the app itself still exposes no Study or Gym content without `APP_PASSWORD`. Add these under the Space **Settings** page:

Space Secrets:

```text
APP_PASSWORD=<your private app password>
SESSION_SECRET=<different random string, at least 32 characters>
DATABASE_URL=<Supabase Postgres connection string including sslmode=require>
CRON_SECRET=<another long random string>
VAPID_PRIVATE_KEY=<generated private key; optional if reminders are disabled>
```

Space Variables:

```text
VAPID_PUBLIC_KEY=<generated public key; optional>
VAPID_SUBJECT=mailto:<your-email>
```

Do not add secrets to `.env` files or Git. The Docker container listens on port `7860`, runs all numbered database migrations before startup, uses the non-root Node user (UID 1000), and exposes `/api/health` for app/database health.

For automatic deployment from this GitHub repository, configure:

GitHub repository secrets:

```text
HF_TOKEN=<fine-grained Hugging Face token with write access to the Space>
CRON_SECRET=<same value used by the Space>
```

GitHub repository variables:

```text
HF_SPACE_ID=<Hugging Face username/space-name>
APP_URL=https://<username>-<space-name>.hf.space
HEALTHCHECK_URL=https://<username>-<space-name>.hf.space/api/health
```

Then push `main` or manually run **Sync Hugging Face Space**. `daily-health.yml` pings app/database health every day at 03:17 UTC. `run-reminders.yml` invokes notification processing at minute 23 of every hour. GitHub schedules use UTC and can be delayed during high load.

## Verification without browser automation

```bash
npm test
npm run lint
npm run build
```

For a production smoke test, start the built app and verify redirects, login cookies, CSV preview/save, history, and `/api/health` with `curl`. The repository's implementation verification intentionally does not require browser automation.
