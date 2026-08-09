# Kal Karega, Aaj Kar

A private, mobile-first app for two routines—nothing else.

- **Study:** add daily tasks, reuse group tags, tick tasks off, and open quiet evidence-based tips when useful.
- **Gym:** import an AI-generated seven-day JSON plan or build one manually, edit every set and instruction, then log what actually happened exercise by exercise.
- **History:** a simple gym calendar shows completed workouts, recovery days, and planned days.
- **Reminder:** one optional morning notification to write the day’s Study tasks.

There is no signup or account system. The app uses the single private password in `APP_PASSWORD`.

## Local setup

Requirements: Node.js 22 and PostgreSQL.

```bash
cp .env.example .env.local
docker compose up -d
npm install
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`. `SESSION_SECRET` must be different from `APP_PASSWORD` and at least 32 characters long.

## Gym JSON flow

Open **Gym → Plan**, choose the first date of the seven-day plan, and use **Copy AI instructions**. Give the copied prompt to an AI, then upload or paste the JSON it returns. The app validates all seven days and opens an editor before saving. The same editor can build a week manually or change a previously saved week.

On **Gym → Today**, follow one exercise at a time. Actual reps and weight begin with the planned values, between-set and after-exercise timers come from the plan, and a single review appears after the final set. The saved plan and immutable actual set history can be copied as the input package for next week’s AI plan.

The exact schema and a copy-ready example are in [docs/GYM_JSON.md](docs/GYM_JSON.md) and [examples/gym-week.json](examples/gym-week.json).

## Morning reminder

Open the bell, choose a morning time, and allow notifications on the device. Web Push requires `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`. The protected `/api/notifications/run` endpoint sends at most one reminder per calendar day in `Asia/Kolkata` when called with `CRON_SECRET`.

## Verification

```bash
npm test
npm run lint
npm run build
```
