# Supabase Setup

## Running the Migrations

To set up the complete database schema, run both migrations in order:

### Migration 1: Core Schema
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy and paste the contents of `migrations/001_initial_schema.sql`
5. Click **Run** or press `Cmd/Ctrl + Enter`

### Migration 2: API Features
1. Create another **New Query**
2. Copy and paste the contents of `migrations/002_add_api_features.sql`
3. Click **Run**

The migrations will create:
- **Core**: `user_settings`, `api_keys` tables
- **API Features**: `webhooks`, `webhook_events`, `idempotency_keys`, `sessions` tables
- **Security**: RLS policies on all tables
- **Performance**: Indexes for fast lookups
- **Automation**: Functions for usage tracking, cleanup, and admin checks
- **Triggers**: Auto-create user settings on signup

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
