do $$
declare
  had_legacy_reminders boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notification_settings'
      and column_name = 'gym_reminder_enabled'
  ) into had_legacy_reminders;

  alter table notification_settings
    alter column study_reminder_time set default '07:00',
    drop column if exists cue_mode,
    drop column if exists gym_reminder_enabled,
    drop column if exists gym_reminder_day,
    drop column if exists gym_reminder_time,
    drop column if exists last_gym_reminder;

  if had_legacy_reminders then
    update notification_settings
    set study_reminder_enabled = true,
        study_reminder_time = '07:00',
        updated_at = now()
    where id = 1;
  end if;
end $$;
