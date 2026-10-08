-- OPTIONAL cloud setup. First create gan_functions_url and gan_reminder_cron_secret
-- in Dashboard Vault. Functions URL = https://YOUR_PROJECT.supabase.co/functions/v1.
-- The cron secret must match REMINDER_CRON_SECRET set in Edge Function secrets.
-- Never put the real secret in this file or the mobile environment.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule(
  'gan-health-reminders',
  '* * * * *',
  $$select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'gan_functions_url') || '/send-reminders',
    headers := jsonb_build_object('Content-Type','application/json','x-reminder-secret',
      (select decrypted_secret from vault.decrypted_secrets where name = 'gan_reminder_cron_secret')),
    body := '{}'::jsonb
  );$$
);
