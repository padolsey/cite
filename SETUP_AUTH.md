# Authentication & API Key Setup Guide

This guide will help you set up the Supabase authentication system and API key management for CITE.

## Overview

The system provides:
- **Magic link signup/signin** - Passwordless authentication via email
- **Email/password auth** - Traditional authentication
- **API key generation** - Users get API keys to access the CITE API
- **Key management** - View, revoke, and track API key usage
- **Admin dashboard** - Manage users, monitor usage, and grant admin privileges

## Prerequisites

1. A Supabase account (free tier works great)
2. Node.js 22.12.0 or later
3. pnpm installed

## Setup Steps

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the database to provision (~2 minutes)

### 2. Get Your Supabase Credentials

1. Go to **Settings → API** in your Supabase dashboard
2. Copy the following values:
   - **Project URL** → `PUBLIC_SUPABASE_URL`
   - **anon public** key → `PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** key → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Update Environment Variables

Add these to your `.env` file:

```bash
# Supabase
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### 4. Run Database Migrations

Run both migrations in order:

**Migration 1: Core Authentication & API Keys**
1. Go to your Supabase dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the contents of `supabase/migrations/001_initial_schema.sql`
5. Paste into the SQL editor
6. Click **Run** or press `Cmd/Ctrl + Enter`

**Migration 2: API Features (Webhooks, Idempotency, Sessions)**
1. Create another **New Query**
2. Copy the contents of `supabase/migrations/002_add_api_features.sql`
3. Paste and click **Run**

These migrations create:
- **Core tables**: `user_settings`, `api_keys`
- **API features**: `webhooks`, `webhook_events`, `idempotency_keys`, `sessions`
- **Security**: Row Level Security (RLS) policies on all tables
- **Performance**: Indexes for fast lookups
- **Automation**: Functions for usage tracking, cleanup, and admin checks
- **Triggers**: Auto-create user settings on signup

### 5. Configure Email Settings (Optional but Recommended)

By default, Supabase sends auth emails from their domain. For production:

1. Go to **Authentication → Email Templates** in Supabase
2. Customize the magic link email template
3. Go to **Settings → Auth** to configure SMTP (optional)

### 6. Test the Flow

1. Start the dev server: `pnpm dev`
2. Visit `http://localhost:5173`
3. Click **Get Started** button
4. Enter your email
5. Choose either:
   - **Magic link** - Check your email for the link
   - **Password signup** - Create account with password
6. After authentication, you'll be redirected to `/account`
7. Create an API key
8. Copy and save it securely (shown only once!)

### 7. Setting Up Admin Access

**Development Mode:**
- In development (`pnpm dev`), `/admin` is accessible to all users
- No admin flag required during local development

**Production Mode:**
To grant admin privileges to a user:

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Run this query (replace with the user's actual ID):
   ```sql
   UPDATE user_settings
   SET is_admin = true
   WHERE user_id = 'user-uuid-here';
   ```
4. To find a user's ID, check the `auth.users` table or use:
   ```sql
   SELECT id, email FROM auth.users WHERE email = 'admin@example.com';
   ```

The admin dashboard at `/admin` provides:
- View all users and their status
- Grant/revoke admin privileges to users
- View all API keys across all users
- Monitor system-wide usage statistics
- Track total requests and key activity

## Using the API

Once you have an API key, use it in the Authorization header:

```bash
curl -X POST http://localhost:5173/api/chat \
  -H "Authorization: Bearer cite_live_xxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [...],
    "config": {...},
    "profile": "auto"
  }'
```

## File Structure

```
src/lib/auth/
├── supabase-client.ts      # Browser-side Supabase client
├── supabase-server.ts      # Server-side Supabase client
├── supabase-admin.ts       # Admin client (service role)
├── api-keys.ts             # API key generation/validation
└── admin.ts                # Admin privilege checking and management

src/lib/components/
└── AuthModal.svelte        # Signup/signin modal

src/routes/
├── +page.svelte            # Homepage (updated with auth modal)
├── account/
│   └── +page.svelte        # API key dashboard
├── admin/
│   └── +page.svelte        # Admin dashboard (dev: open, prod: admin-only)
└── api/
    ├── chat/+server.ts     # Chat endpoint (now requires API key)
    ├── keys/+server.ts     # API key management endpoints
    └── admin/+server.ts    # Admin endpoints (user/key management)

supabase/
└── migrations/
    ├── 001_initial_schema.sql      # Core auth & API keys
    └── 002_add_api_features.sql    # Webhooks, idempotency, sessions
```

## API Endpoints

### `POST /api/keys`
Create a new API key
- **Auth**: Requires Supabase session cookie
- **Body**: `{ "name": "Production Key" }`
- **Returns**: `{ "id": "uuid", "key": "cite_live_..." }`

### `GET /api/keys`
List all API keys for the authenticated user
- **Auth**: Requires Supabase session cookie
- **Returns**: `{ "keys": [...] }`

### `DELETE /api/keys?id=xxx`
Revoke an API key
- **Auth**: Requires Supabase session cookie
- **Query**: `id` - The key ID to revoke
- **Returns**: `{ "success": true }`

### `POST /api/chat`
CITE chat endpoint (now requires API key)
- **Auth**: Requires `Authorization: Bearer cite_live_...` header
- **Body**: `{ "messages": [...], "config": {...}, "profile": "auto" }`
- **Returns**: SSE stream

### `GET /api/admin`
Get admin dashboard data (users, keys, stats)
- **Auth**: Requires Supabase session + admin privileges (bypassed in dev mode)
- **Returns**: `{ "stats": {...}, "users": [...], "apiKeys": [...] }`

### `POST /api/admin`
Update user admin status
- **Auth**: Requires Supabase session + admin privileges (bypassed in dev mode)
- **Body**: `{ "userId": "uuid", "isAdmin": true }`
- **Returns**: `{ "success": true }`

### `DELETE /api/admin?action=revoke-key&keyId=xxx`
Revoke any user's API key (admin only)
- **Auth**: Requires Supabase session + admin privileges (bypassed in dev mode)
- **Query**: `action=revoke-key`, `keyId` - The key ID to revoke
- **Returns**: `{ "success": true }`

## Security Features

1. **Row Level Security (RLS)** - Users can only see/manage their own API keys
2. **Hashed keys** - API keys are hashed (SHA-256) before storage
3. **One-time display** - API keys are shown only once at creation
4. **Revocation** - Keys can be revoked without deletion (audit trail)
5. **Usage tracking** - Track last used time and request count
6. **Service role separation** - Admin operations use separate credentials
7. **Admin access control** - Admin endpoints check user privileges (except in dev mode)
8. **Automatic user settings** - User settings created automatically on signup via database trigger

## Troubleshooting

### "Unauthorized" errors
- Check that your Supabase credentials are correct in `.env`
- Verify the migration was run successfully
- Check browser console for auth errors

### Magic links not working
- Check spam folder
- Verify email template redirect URL matches your domain
- Check Supabase logs in dashboard

### API key validation failing
- Ensure the Authorization header format is correct: `Bearer cite_live_...`
- Verify the key hasn't been revoked
- Check Supabase logs for errors

## Production Checklist

Before deploying to production:

- [ ] Configure custom SMTP for email sending
- [ ] Customize email templates with your branding
- [ ] Set up rate limiting on `/api/keys` endpoint
- [ ] Configure Supabase auth redirect URLs for production domain
- [ ] Enable email confirmation (Settings → Auth in Supabase)
- [ ] Set up monitoring for failed auth attempts
- [ ] Configure API key usage limits per user
- [ ] Add webhook for high-usage alerts
- [ ] Review and adjust RLS policies if needed
- [ ] Set up database backups

## Next Steps

- Read the [API documentation](/docs) for integration examples
- Try the [live demo](/sandbox) to see CITE in action
- Join our community for support

---

**Need help?** Check the [main README](./README.md) or open an issue on GitHub.
