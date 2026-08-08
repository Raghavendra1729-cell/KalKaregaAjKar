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
npm run db:migrate
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

## RunOnFlux Orbit deployment

Orbit is the current container-hosting target. Open [Orbit Deploy](https://orbit.runonflux.com/dashboard/deploy), connect this public repository, and use the repository root:

```text
Repository: https://github.com/Raghavendra1729-cell/KalKaregaAjKar
Branch: main
Project path: <leave empty>
App port: 3000
Health check path: /api/health
```

Orbit detects Node.js and Next.js from `package.json`. If the wizard exposes advanced build fields, use:

```text
Install command: npm ci --include=dev
Build command: npm run build
Run command: npm start
```

The start script binds to `0.0.0.0` and uses Orbit's `APP_PORT`, with `PORT` and `3000` as fallbacks. `pre-deploy.sh` runs the idempotent PostgreSQL migrations before each Orbit build.

Add these values using Orbit's **Secrets** controls, not as public/plain component environment variables:

```text
APP_PASSWORD=<your private app password>
SESSION_SECRET=<different random string, at least 32 characters>
DATABASE_URL=<Supabase transaction-pooler URL including sslmode=require>
CRON_SECRET=<another long random string>
VAPID_PRIVATE_KEY=<generated private key; optional>
```

Add these non-secret environment variables:

```text
VAPID_PUBLIC_KEY=<matching generated public key; optional>
VAPID_SUBJECT=mailto:<your-email>
```

Do not enter secrets into a field that says they will be public. Orbit advertises runtime secret injection, while the lower-level non-Enterprise FluxCloud component form warns that plain environment variables can be visible through its public API. If the wizard does not give you a distinct protected **Secrets** control, stop instead of pasting `APP_PASSWORD`, `SESSION_SECRET`, `DATABASE_URL`, `CRON_SECRET`, or `VAPID_PRIVATE_KEY`.

Start with Orbit's Free plan (0.5 CPU, 1 GB RAM, 5 GB storage, one instance). If the build log reports an out-of-memory error or exit code 137, choose the 4 GB Standard plan; Orbit's documentation recommends 3–4 GB for typical Next.js dashboards. Application state remains in Supabase, so the container needs no persistent volume.

After deployment, open `https://<orbit-app-domain>/api/health`. Then set these GitHub Actions values so health monitoring and reminders call Orbit:

```text
Repository variable APP_URL=https://<orbit-app-domain>
Repository variable HEALTHCHECK_URL=https://<orbit-app-domain>/api/health
Repository secret CRON_SECRET=<same value stored in Orbit>
```

Orbit connects its own push webhook during repository setup, so every push to `main` should rebuild automatically. Do not add polling or a second webhook unless the dashboard reports that automatic deployments are disabled.

## Vercel deployment

Import this GitHub repository into a Vercel **Hobby** project. Vercel detects Next.js automatically; keep the root directory as the repository root and leave the framework, install, build, and output settings on their defaults. The repository pins Node.js 22 for builds and functions.

Add the following under **Project → Settings → Environment Variables** and select **Production**. The app reads the VAPID public key through an authenticated API response, so it intentionally remains named `VAPID_PUBLIC_KEY` rather than using a `NEXT_PUBLIC_` prefix.

Required secrets:

```text
APP_PASSWORD=<your private app password>
SESSION_SECRET=<different random string, at least 32 characters>
DATABASE_URL=<Supabase transaction-pooler connection string including sslmode=require>
CRON_SECRET=<another long random string>
```

Optional Web Push values:

```text
VAPID_PUBLIC_KEY=<generated public key>
VAPID_PRIVATE_KEY=<matching generated private key>
VAPID_SUBJECT=mailto:<your-email>
```

Do not paste secret values into source files or commit `.env.local`. Apply the numbered database migrations from your computer before using the deployment:

```bash
npm install
npm run db:migrate
```

The migration command loads `.env.local` automatically. Vercel does not use the Docker startup command, so migrations are deliberately kept separate from the Vercel build: preview builds must never mutate the production database.

After the first production deployment, verify `https://<project>.vercel.app/api/health` returns an `ok` status. Then configure the reminder and health workflows in this GitHub repository:

GitHub repository secrets:

```text
CRON_SECRET=<same value used by the Space>
```

GitHub repository variables:

```text
APP_URL=https://<project>.vercel.app
HEALTHCHECK_URL=https://<project>.vercel.app/api/health
```

Every push to `main` will deploy automatically after the repository is connected to Vercel. `daily-health.yml` pings app/database health every day at 03:17 UTC. `run-reminders.yml` invokes notification processing at minute 23 of every hour. GitHub schedules use UTC and can be delayed during high load.

The existing Dockerfile is retained for local testing and other container hosts, but Vercel does not use it.

## Verification without browser automation

```bash
npm test
npm run lint
npm run build
```

For a production smoke test, start the built app and verify redirects, login cookies, CSV preview/save, history, and `/api/health` with `curl`. The repository's implementation verification intentionally does not require browser automation.
