-- Run once in Supabase SQL Editor after P1 migration.
-- Publishing INSERT events requires membership-based SELECT RLS on public.messages.
-- No REPLICA IDENTITY FULL needed for INSERT-only realtime.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END
$$;
