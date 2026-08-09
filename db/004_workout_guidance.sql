alter table workout_items
  add column if not exists equipment text,
  add column if not exists instructions text;
