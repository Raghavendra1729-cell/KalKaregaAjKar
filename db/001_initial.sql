create extension if not exists pgcrypto;

create table if not exists study_days (
  plan_date date primary key,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists study_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_date date not null references study_days(plan_date) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  group_name text,
  duration_minutes integer check (duration_minutes is null or duration_minutes between 1 and 1440),
  notes text,
  sort_order integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists study_tasks_plan_date_idx on study_tasks(plan_date, sort_order);

create table if not exists workout_weeks (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  name text,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workout_days (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references workout_weeks(id) on delete cascade,
  plan_date date not null unique,
  day_type text not null check (day_type in ('workout', 'rest')),
  title text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workout_days_week_idx on workout_days(week_id, plan_date);

create table if not exists workout_items (
  id uuid primary key default gen_random_uuid(),
  workout_day_id uuid not null references workout_days(id) on delete cascade,
  phase text not null check (phase in ('warm_up', 'exercise', 'stretching')),
  sort_order integer not null,
  exercise_name text not null check (char_length(exercise_name) between 1 and 160),
  sets integer check (sets is null or sets between 1 and 100),
  reps integer check (reps is null or reps between 1 and 10000),
  weight_kg numeric(7,2) check (weight_kg is null or weight_kg >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds between 1 and 86400),
  rest_seconds integer check (rest_seconds is null or rest_seconds between 0 and 3600),
  sides integer check (sides is null or sides between 1 and 10),
  notes text,
  created_at timestamptz not null default now(),
  unique(workout_day_id, phase, sort_order)
);
create index if not exists workout_items_day_idx on workout_items(workout_day_id, phase, sort_order);

create table if not exists workout_sessions (
  id uuid primary key default gen_random_uuid(),
  workout_day_id uuid not null unique references workout_days(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists workout_item_progress (
  session_id uuid not null references workout_sessions(id) on delete cascade,
  workout_item_id uuid not null references workout_items(id) on delete cascade,
  completed_sets integer not null default 0 check (completed_sets >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (session_id, workout_item_id)
);

create table if not exists progress_photos (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  image_data bytea not null,
  byte_size integer not null check (byte_size between 1 and 2097152),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notification_settings (
  id smallint primary key default 1 check (id = 1),
  cue_mode text not null default 'vibrate' check (cue_mode in ('vibrate', 'chime', 'beep', 'silent')),
  study_reminder_enabled boolean not null default true,
  study_reminder_time time not null default '21:00',
  gym_reminder_enabled boolean not null default true,
  gym_reminder_day smallint not null default 0 check (gym_reminder_day between 0 and 6),
  gym_reminder_time time not null default '18:00',
  timezone text not null default 'Asia/Kolkata',
  last_study_reminder date,
  last_gym_reminder date,
  updated_at timestamptz not null default now()
);
insert into notification_settings(id) values (1) on conflict (id) do nothing;

create table if not exists push_subscriptions (
  endpoint text primary key,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
