alter table workout_items
  add column if not exists rest_after_exercise_seconds integer
    check (rest_after_exercise_seconds is null or rest_after_exercise_seconds between 0 and 3600),
  add column if not exists substitution text,
  add column if not exists safety_note text;

create table if not exists workout_planned_sets (
  id uuid primary key default gen_random_uuid(),
  workout_item_id uuid not null references workout_items(id) on delete cascade,
  set_number integer not null check (set_number between 1 and 100),
  reps integer check (reps is null or reps between 1 and 10000),
  weight_kg numeric(7,2) check (weight_kg is null or weight_kg >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds between 1 and 86400),
  sides integer not null default 1 check (sides between 1 and 10),
  created_at timestamptz not null default now(),
  unique(workout_item_id, set_number),
  check (reps is not null or duration_seconds is not null)
);
create index if not exists workout_planned_sets_item_idx
  on workout_planned_sets(workout_item_id, set_number);

create table if not exists workout_exercise_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references workout_sessions(id) on delete cascade,
  workout_item_id uuid references workout_items(id) on delete set null,
  exercise_name text not null,
  phase text not null check (phase in ('warm_up', 'exercise', 'stretching')),
  sort_order integer not null,
  difficulty text check (difficulty in ('easy', 'right', 'too_hard')),
  discomfort boolean not null default false,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists workout_exercise_logs_session_item_idx
  on workout_exercise_logs(session_id, workout_item_id)
  where workout_item_id is not null;

create table if not exists workout_set_logs (
  exercise_log_id uuid not null references workout_exercise_logs(id) on delete cascade,
  set_number integer not null check (set_number between 1 and 100),
  planned_reps integer,
  planned_weight_kg numeric(7,2),
  planned_duration_seconds integer,
  planned_sides integer not null default 1 check (planned_sides between 1 and 10),
  actual_reps integer check (actual_reps is null or actual_reps between 0 and 10000),
  actual_weight_kg numeric(7,2) check (actual_weight_kg is null or actual_weight_kg >= 0),
  actual_duration_seconds integer check (actual_duration_seconds is null or actual_duration_seconds between 0 and 86400),
  completed_sides integer not null default 0 check (completed_sides between 0 and 10),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (exercise_log_id, set_number)
);

insert into workout_planned_sets(
  workout_item_id, set_number, reps, weight_kg, duration_seconds, sides
)
select i.id, generated.set_number, i.reps, i.weight_kg, i.duration_seconds,
  coalesce(i.sides, 1)
from workout_items i
cross join lateral generate_series(1, greatest(coalesce(i.sets, 1), 1))
  as generated(set_number)
where (i.reps is not null or i.duration_seconds is not null)
on conflict (workout_item_id, set_number) do nothing;

update workout_items
set rest_after_exercise_seconds = coalesce(rest_after_exercise_seconds, 0)
where rest_after_exercise_seconds is null;
