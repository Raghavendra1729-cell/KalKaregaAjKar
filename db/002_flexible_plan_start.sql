do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'workout_weeks' and column_name = 'week_start'
  ) then
    alter table workout_weeks rename column week_start to plan_start;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'progress_photos' and column_name = 'week_start'
  ) then
    alter table progress_photos rename column week_start to plan_start;
  end if;
end $$;
