# Supabase Setup

## Running the Migrations & Seed

To set up the complete database schema, run the schema migration and then the seed:

### Migration 1: Core Schema (Fresh Canvas)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy and paste the contents of `migrations/001_initial_schema.sql`
5. Click **Run** or press `Cmd/Ctrl + Enter`

This creates all core tables, functions, and policies, including:
- `user_settings`, `api_keys`
- `webhooks`, `webhook_events`
- `idempotency_keys`, `sessions`
- `crisis_resources` schema (no data)

### Seed: Crisis Resources (`supabase/seed.sql`)

If you want to use the full built-in crisis resource dataset:

**Option A – Run in Supabase SQL Editor**
1. Create another **New Query**
2. Copy and paste the contents of `seed.sql`
3. Click **Run**

**Option B – Run locally with Supabase CLI**
```bash
cd /Users/james/proj/cite
supabase db reset
```
This will apply all migrations and then run `seed.sql` automatically.

This seeds the `crisis_resources` table with the full global dataset (no user data).

The schema + seed together provide:
- **Core**: `user_settings`, `api_keys`, `sessions`
- **API Features**: `webhooks`, `webhook_events`, `idempotency_keys`
- **Crisis Resources**: `crisis_resources` + helper functions
- **Security**: RLS policies on all tables
- **Performance**: Indexes for fast lookups
- **Automation**: Functions for usage tracking, cleanup, and admin checks
- **Triggers**: Auto-create user settings on signup, auto-update crisis resource timestamps

## Cleanup Functions

Migration 2 adds cleanup functions that should be run periodically (e.g., via cron):

```sql
-- Clean up expired idempotency keys (72 hour retention)
SELECT cleanup_expired_idempotency_keys();

-- Clean up expired sessions
SELECT cleanup_expired_sessions();

-- Clean up old webhook events (30 day retention)
SELECT cleanup_old_webhook_events();
```

## Environment Variables

Make sure you have these in your `.env` file:

```bash
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

Get these from: **Supabase Dashboard → Settings → API**
