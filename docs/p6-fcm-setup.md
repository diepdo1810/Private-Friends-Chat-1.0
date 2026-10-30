# P6.1 — Android FCM push deployment (NOT automatically deployed)

## Firebase

- Firebase Android project: `private-friends-chat-3e967`
- Android package: `com.diepdo.privatefriendschat`
- FCM HTTP v1: Enabled
- `android/app/google-services.json` is client configuration shipped with APK, **NOT** Firebase Admin service account JSON.
- Restrict Firebase Web API key in Google Cloud Console to intended Android app/API usage where supported.

## Supabase setup (requires Owner access)

1. Apply `supabase/migrations/20261029010000_p6_push_devices.sql` via Supabase SQL Editor. Run only once.
2. Firebase Console → Project Settings → **Service Accounts** → generate service-account JSON *privately*.
3. Store full JSON in Supabase **Edge Function Secret** `FCM_SERVICE_ACCOUNT_JSON`; never check into repo, never paste in ChatGPT or GitHub.
4. Generate random webhook-only secret, store in Supabase Secrets as `PUSH_WEBHOOK_SECRET`.
5. Deploy `supabase/functions/push-message` with `verify_jwt=false` (function validates `x-push-webhook-secret` and independently fetches stored message).
6. Configure Database Webhook for INSERT on `public.messages`: call `push-message`, HTTP POST, header `x-push-webhook-secret` containing the same private value; store securely.
7. Run two-account Android physical device test. A sends, B receives while background/locked; no self push; logout disables token; repeated webhook does not duplicate push.

The Edge Function requires `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (server-side Supabase runtime) and `FCM_SERVICE_ACCOUNT_JSON` / `PUSH_WEBHOOK_SECRET` secrets.

## CI/build

GitHub Actions uses committed `google-services.json` for Android debug. Publishable Firebase client configuration is embedded in Android APK; **never** commit service-account private key.

Android foreground and browser notifications are separate from FCM background push. Web closed-tab push is out of scope.

## Gate

DO NOT MERGE P6.1 UNTIL real FCM send is confirmed and Supabase secrets/webhook/migration are provisioned. CI green alone is insufficient.
