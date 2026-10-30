-- P6.1: Private Android FCM tokens. No client can inspect other users' devices.
CREATE TABLE IF NOT EXISTS public.push_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL CHECK (char_length(device_id) BETWEEN 16 AND 100),
  fcm_token text NOT NULL UNIQUE CHECK (char_length(fcm_token) BETWEEN 40 AND 4096),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_push_devices_recipient ON public.push_devices (user_id) WHERE enabled;
ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_devices FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_devices TO authenticated;
CREATE POLICY push_devices_select_self ON public.push_devices FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY push_devices_insert_self ON public.push_devices FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY push_devices_update_self ON public.push_devices FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY push_devices_delete_self ON public.push_devices FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Server-only idempotency guard against duplicated webhook delivery.
CREATE TABLE IF NOT EXISTS public.push_delivery_log (
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES public.push_devices(id) ON DELETE CASCADE,
  delivered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, device_id)
);
ALTER TABLE public.push_delivery_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_delivery_log FROM PUBLIC, anon, authenticated;
-- service_role (Supabase Edge Function admin client) bypasses RLS.
