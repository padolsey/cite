# CITE Safety API

**Mental health safety infrastructure for conversational AI.**

CITE provides conversation-aware risk detection and clinically-grounded escalation guidance for AI chat applications. Drop-in API with database-backed crisis resources, authentication, and admin tools.

Built while studying chatbot safety at [CIP](https://cip.org) and [weval.org](https://weval.org).

---

## The Problem

Recent incidents of AI-related harm share common patterns:
- **1M+ weekly crisis conversations** happening in AI chat (OpenAI, 2024)
- **<15% of apps** have mental-health-specific safety layers
- **Generic content moderation isn't enough** - can't distinguish venting from active planning

Most AI chat apps use binary filters ("self-harm: yes/no") that miss critical context, provide no escalation guidance, and can't track risk over conversations.

---

## What CITE Does

```typescript
import { CITEClient } from '@cite-safety/client';

const cite = new CITEClient({ apiKey: process.env.CITE_API_KEY });

// Evaluate conversation for mental health risk
const result = await cite.evaluate({
  messages: [
    { role: 'user', content: "I've been feeling really hopeless lately" }
  ],
  config: {
    user_country: 'GB',  // Optional - will use language inference if omitted
    locale: 'en-GB'       // Optional
  }
});

// Get structured risk assessment
console.log(result.risk_level);      // "medium"
console.log(result.confidence);      // 0.82
console.log(result.explanation);     // "User expressing hopelessness..."

// Use escalation guidance
if (result.show_crisis_resources) {
  displayBanner(result.crisis_resources);  // 988 Lifeline, etc.
}

// Send safe response
sendToUser(result.safe_reply);

// Log if recommended
if (result.log_recommended) {
  await db.logSafetyEvent(conversationId, result);
}
```

---

## Key Features

### 📊 **Conversation-Aware Risk Detection**
Not just "self-harm: yes/no" — track ideation levels, trends, and history across the full conversation with confidence scores.

### 🎯 **Clinically-Grounded Taxonomy**
Severity indicators inspired by C-SSRS structure and DSM-5 criteria. Transparent methodology, not a black box.

### 🛡️ **Actionable Escalation Plans**
Get specific actions (show resources, block method advice, notify human), constraints, and template text you can use directly.

### 🌍 **Database-Backed Crisis Resources**
Regional crisis lines and support services for 15+ countries. Admin UI for managing resources - always current, properly localized.

### 📝 **Full Production Infrastructure**
- ✅ Supabase authentication & database
- ✅ API key management & rate limiting
- ✅ Admin panel for users & resources
- ✅ Structured audit trails
- ✅ Webhooks for escalation
- ✅ Idempotency for safe retries

### 🆓 **Free Tier Available**
**No API key required for testing.** 60 requests/minute per session. Perfect for prototyping and demos.

### 🔓 **Open Source & Self-Hostable**
Transparent, auditable, and can run entirely on your infrastructure. No vendor lock-in, no black boxes.

---

## Architecture

### Full Stack Overview

```
┌─────────────────────────────────────────────────────────┐
│ Frontend (SvelteKit)                                    │
│ ┌────────────┐ ┌──────────────┐ ┌──────────────┐      │
│ │  Homepage  │ │ API Sandbox  │ │ Admin Panel  │      │
│ │  /         │ │ /api-sandbox │ │ /admin       │      │
│ └────────────┘ └──────────────┘ └──────────────┘      │
│                                                         │
│ ┌────────────┐ ┌──────────────┐ ┌──────────────┐      │
│ │ Chat Demo  │ │ Account Page │ │ Docs         │      │
│ │ /chat-demo │ │ /account     │ │ /docs        │      │
│ └────────────┘ └──────────────┘ └──────────────┘      │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ API Layer (SvelteKit Endpoints)                         │
│ ┌────────────────────────────────────────────────────┐  │
│ │ /api/v1/evaluate - Risk evaluation endpoint        │  │
│ │ • Free tier: No auth required                      │  │
│ │ • Authenticated tier: Bearer token                 │  │
│ │ • Rate limits: 60/min per session, 500/min per IP │  │
│ └────────────────────────────────────────────────────┘  │
│                                                         │
│ ┌────────────────────────────────────────────────────┐  │
│ │ /api/admin - Admin operations                      │  │
│ │ /api/auth - Authentication                         │  │
│ └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Evaluation Engine (lib/)                                │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Evaluator → RiskClassifier → LLM Provider         │  │
│ │                ↓                                    │  │
│ │     DatabaseResourceResolver                       │  │
│ └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Database (Supabase PostgreSQL)                          │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│ │ users        │ │ api_keys     │ │ sessions     │    │
│ │ (auth.users) │ │ (public)     │ │ (public)     │    │
│ └──────────────┘ └──────────────┘ └──────────────┘    │
│                                                         │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│ │ user_settings│ │ crisis_      │ │ webhooks     │    │
│ │              │ │ resources    │ │              │    │
│ └──────────────┘ └──────────────┘ └──────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### API Endpoint: `/v1/evaluate`

**Free tier (no auth):**
```json
{
  "messages": [{ "role": "user", "content": "..." }],
  "config": { "user_country": "US" }
}
```

**Authenticated tier (optional):**
```http
Authorization: Bearer cite_live_xxxxx
```

### Backend Architecture (`lib/`)

```
lib/
├── evaluation/
│   ├── Evaluator.ts           # Main orchestrator
│   └── types.ts                # API request/response types
├── classification/
│   ├── RiskClassifier.ts       # Single or multi-judge classification
│   ├── judges/
│   │   ├── BaseJudge.ts        # Abstract base for all judges
│   │   └── RiskLevelJudge.ts   # Combined risk level + types classification
│   └── types/                  # Classification scales & types
├── responses/
│   └── templates.ts            # Safe response templates by risk level
├── resources/
│   ├── DatabaseResourceResolver.ts  # Database-backed resolver
│   └── registry.ts             # Fallback static resources
├── prompts/
│   └── templates.ts            # Centralized LLM prompts
└── providers/
    ├── IProvider.ts            # LLM provider interface
    ├── OpenRouterProvider.ts   # Production provider
    └── FakeProvider.ts         # Testing provider
```

### SvelteKit App (`src/`)

```
src/
├── routes/
│   ├── +page.svelte                    # Marketing homepage
│   ├── /api-sandbox/                   # Interactive API tester (free)
│   ├── /chat-demo-sandbox/             # CITE chatbot demo (legacy)
│   ├── /docs/                          # Documentation pages
│   ├── /account/                       # User account & API keys
│   ├── /admin/                         # Admin dashboard
│   │   ├── +page.svelte                # Users & API keys management
│   │   └── /resources/                 # Crisis resources CRUD
│   └── /api/
│       ├── v1/evaluate/+server.ts      # Main evaluation endpoint
│       ├── auth/+server.ts             # Auth operations
│       └── admin/+server.ts            # Admin operations
├── lib/
│   ├── auth/
│   │   ├── supabase-client.ts          # Client-side Supabase
│   │   ├── supabase-admin.ts           # Server-side admin client
│   │   ├── api-keys.ts                 # API key validation
│   │   └── admin.ts                    # Admin operations
│   └── components/                     # Svelte components
└── hooks.server.ts                     # Global rate limiting
```

### Database Schema (Supabase)

```sql
-- Authentication (managed by Supabase Auth)
auth.users

-- User settings and permissions
public.user_settings
  - user_id (FK to auth.users)
  - is_admin
  - created_at, updated_at

-- API key management
public.api_keys
  - id, user_id (FK)
  - key_hash (unique)
  - name, created_at, last_used_at, revoked_at
  - request_count, rate_limit_tier

-- Crisis resources (admin-managed)
public.crisis_resources
  - id, country_code, name, type
  - phone, text_instructions, chat_url
  - availability, languages[], description
  - service_scope[], population_served[]
  - website_url, notes, alternative_numbers (JSON)
  - enabled, display_order
  - created_by, updated_by

-- Webhooks
public.webhooks
  - id, user_id (FK)
  - url, secret, min_risk_level
  - enabled, created_at, updated_at

public.webhook_events
  - id, webhook_id (FK)
  - event_type, payload (JSON)
  - status, http_status, error_message
  - attempt_count, last_attempt_at

-- Session management
public.sessions
  - id, user_id (FK), conversation_id
  - risk_state (JSON), policy_id
  - last_evaluated_at, expires_at

-- Idempotency
public.idempotency_keys
  - key (PK), user_id (FK)
  - response_status, response_body (JSON)
  - created_at, expires_at (72 hours)
```

**Row Level Security (RLS):** All tables have RLS enabled. Users can only access their own data. Admins have elevated permissions.

---

## Setup

### Prerequisites

- Node.js 18+
- pnpm (or npm)
- Supabase account (free tier works)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/cite.git
cd cite
pnpm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# OpenRouter API (for LLM classification)
OPENROUTER_API_KEY=sk-or-v1-xxxxx

# Supabase (for database & auth)
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Get Supabase credentials:**
1. Create project at [supabase.com](https://supabase.com)
2. Go to Settings → API
3. Copy URL, anon key, and service_role key

### 3. Set Up Database

```bash
# Link to your Supabase project
supabase link --project-ref your-project-ref

# Apply migrations (creates all tables, RLS policies, functions)
supabase db push

# Optional: Seed with crisis resources
supabase db execute --file supabase/seed.sql
```

**Migrations include:**
- `001_initial_schema.sql` - Core tables, RLS policies, functions
- `002_add_admin_policies.sql` - Admin access policies
- `003_add_admin_policies.sql` - Additional admin features
- `004_grant_service_role_permissions.sql` - Service role permissions

### 4. Create First Admin User

```bash
# Start dev server
pnpm dev

# Visit http://localhost:5173
# Sign up for an account
# In Supabase dashboard → Table Editor → user_settings
# Set is_admin = true for your user
```

Or via SQL:

```sql
-- Get your user ID from auth.users
SELECT id, email FROM auth.users;

-- Grant admin access
UPDATE user_settings
SET is_admin = true
WHERE user_id = 'your-user-id-here';
```

### 5. Run Development Server

```bash
pnpm dev
# Open http://localhost:5173
```

---

## Quick Start

### Free Tier Testing (No Signup)

Visit `/api-sandbox` for instant testing:
- Pre-loaded examples (low/medium/high/critical risk)
- Live request builder
- Real-time response display
- No auth required

**Rate limits:** 60 requests/min per session, 500/min per IP

### With API Key (Production)

1. **Create account** at `/account`
2. **Generate API key** in dashboard
3. **Make requests:**

```bash
curl -X POST http://localhost:5173/api/v1/evaluate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer cite_live_xxxxx" \
  -d '{
    "messages": [
      {"role": "user", "content": "I feel hopeless"}
    ],
    "config": {"user_country": "US"}
  }'
```

### Admin Panel

Access at `/admin` (requires admin privileges):
- **User management** - View users, grant/revoke admin
- **API key management** - View all keys, revoke if needed
- **Crisis resources** - Add/edit/remove resources by country
- **System stats** - Usage metrics, request counts

---

## Key Design Decisions

### 1. **Free Tier for Testing**
API evaluation works without authentication. Rate limited by session + IP. Makes it easy to test and prototype.

### 2. **Database-Backed Crisis Resources**
Resources stored in Supabase with admin UI for management. No more editing JSON files - update resources in production instantly.

### 3. **Single Progressive Endpoint**
One `/v1/evaluate` endpoint that's simple by default but accepts advanced parameters. No separate `/simple` vs `/advanced` routes.

### 4. **Centralized Prompts**
All LLM prompts in `lib/prompts/templates.ts`. Never scattered across the codebase. Easy to review for safety.

### 5. **Classification Scales, Not Scores**
Uses named scales (`CLASS_HIGH`, `CLASS_CRITICAL`) instead of numeric scores to avoid LLM bias toward middle values.

### 6. **Dependency Injection for Testing**
- `IProvider` interface for LLM abstraction
- `FakeProvider` for fast unit tests (no API calls)
- `OpenRouterProvider` for production and E2E tests

### 7. **Template-Based Responses**
Safe responses from pre-written templates (by risk level × age band), not LLM-generated. Predictable, reviewable, fast.

### 8. **Stateless API**
You manage conversation state. We evaluate risk. Clean separation of concerns.

### 9. **ROLP (Role Of Least Privilege)**
Untrusted user content always in user role, never in system prompts. Prevents prompt injection.

---

## Testing Strategy

### Unit Tests (Fast, No LLM)
```bash
pnpm test
```
- Uses `FakeProvider` with mocked responses
- 32 tests covering all components
- Runs in ~300ms

### E2E Tests (Live LLM Validation)
```bash
# Run tests (no logging)
pnpm test:llm

# Run with detailed classification output
DEBUG_CLASSIFICATION=true pnpm test:llm

# Run with full payload/response logging (saves to test-logs/)
pnpm test:llm:log
```
- Uses real OpenRouter API
- 7 integration tests + 6 validation tests
- Validates actual classification accuracy
- Shows raw LLM responses and parsed results
- **New:** Logs all payloads to `test-logs/` for analysis ([docs](docs/test-logging.md))

### Test Coverage
- ✅ Resource resolver: 14 tests
- ✅ Risk classifier: 8 tests
- ✅ Evaluator: 10 tests
- ✅ Integration (E2E): 7 tests
- ✅ Validation (C-SSRS levels): 6 tests
- **Total: 45 tests, 100% passing**

---

## Validation Results (Live LLM)

Tested with real OpenRouter API using Claude Haiku 4.5:

| Test Case | Expected | Actual | Confidence |
|-----------|----------|--------|------------|
| General question | `none` | ✅ `none` | 1.0 |
| Passive ideation | `medium` | ✅ `medium` | 0.75 |
| Active with method | `high` | ✅ `high` | 0.85 |
| Specific plan | `critical` | ✅ `critical` | 0.9 |
| Jailbreak attempt | `high/critical` | ✅ `high` | 0.85 |
| Academic discussion | `none/low` | ✅ `none` | 1.0 |

**6/6 perfect classification** with clinically grounded explanations.

---

## Crisis Resources

Database includes crisis resources for 15+ countries, manageable via admin panel at `/admin/resources`:

- 🇺🇸 United States (988 Lifeline)
- 🇬🇧 United Kingdom (Samaritans)
- 🇨🇦 Canada (Talk Suicide Canada)
- 🇦🇺 Australia (Lifeline)
- 🇳🇿 New Zealand (1737)
- 🇮🇪 Ireland (Pieta House)
- 🇩🇪 Germany (Telefonseelsorge)
- 🇫🇷 France (SOS Amitié)
- 🇪🇸 Spain (Teléfono de la Esperanza)
- 🇮🇹 Italy (Telefono Amico)
- 🇯🇵 Japan (TELL Lifeline)
- 🇰🇷 South Korea (1393)
- 🇮🇳 India (AASRA)
- 🇧🇷 Brazil (CVV)
- 🇲🇽 Mexico (Línea de la Vida)

**Adding new resources:** Use admin panel at `/admin/resources` - no code changes required.

---

## Risk Levels

| Level | Description | Examples | Actions |
|-------|-------------|----------|---------|
| **none** | No mental health concerns detected | General questions, casual chat | No special handling |
| **low** | General distress, not crisis | Stress, frustration, sadness | Empathetic support |
| **medium** | Passive ideation, significant distress | "Wish I could disappear" | Show crisis resources |
| **high** | Active ideation with method or plan | "Been thinking about pills" | Highlight urgency, block method details |
| **critical** | Imminent risk with specific plan | "Doing it tonight" | Limit chat, require acknowledgement |

---

## Production Considerations

This implementation is production-ready with comprehensive infrastructure:

- ✅ **Authentication** - Supabase Auth with email/password
- ✅ **Rate limiting** - 60/min per session + 500/min per IP (free tier)
- ✅ **Database** - PostgreSQL with RLS policies
- ✅ **Admin panel** - User & resource management
- ✅ **API key management** - Generation, revocation, usage tracking
- ✅ **Error handling** - Comprehensive error responses
- ✅ **Testing** - 45 tests with E2E validation
- ✅ **Audit trails** - Request logging, idempotency
- ⚠️ **Monitoring** - Add alerting for high-risk events
- ⚠️ **Human review** - Build workflow for critical escalations
- ⚠️ **Webhooks** - Tables exist, implementation pending
- ⚠️ **A/B testing** - Framework for evaluating classifier improvements

---

## Development

### Project Structure
```
cite/
├── lib/                    # Core safety API
│   ├── evaluation/         # Main orchestrator
│   ├── classification/     # Risk classification
│   ├── responses/          # Safe response templates
│   ├── resources/          # Crisis resource resolution
│   ├── prompts/            # Centralized LLM prompts
│   └── providers/          # LLM provider abstraction
├── src/                    # SvelteKit app
│   ├── routes/             # Pages & API endpoints
│   │   ├── /api-sandbox/   # Interactive API tester
│   │   ├── /admin/         # Admin panel
│   │   └── /api/v1/        # API endpoints
│   ├── lib/
│   │   ├── auth/           # Auth & admin logic
│   │   └── components/     # UI components
│   └── hooks.server.ts     # Global rate limiting
├── supabase/
│   ├── migrations/         # Database migrations
│   └── seed.sql           # Crisis resources seed data
├── tests/                  # Test suites
│   ├── classification/     # Classifier tests
│   ├── evaluation/         # Evaluator tests
│   ├── resources/          # Resource resolver tests
│   ├── integration/        # E2E tests
│   └── validation/         # Live LLM validation
└── static/docs/            # Documentation
```

### Key Commands
```bash
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm preview          # Preview production build
pnpm check            # Type checking
pnpm test             # Run unit tests
pnpm test:llm         # Run E2E tests
pnpm test:watch       # Watch mode

# Database
supabase db push      # Apply migrations
supabase db reset     # Reset & reseed database
```

### Adding New Features

**Add a new country's crisis resources:**
Use the admin panel at `/admin/resources` - no code required!

**Add a new risk type:**
```typescript
// lib/classification/types/index.ts
export type RiskLevel =
  | 'none'
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | 'your_new_level';  // Add here

// Update CLASSIFICATION_SCALES
export const CLASSIFICATION_SCALES = {
  // ...
  CLASS_YOUR_NEW: { level: 'your_new_level', confidence: 0.8 }
};
```

**Modify response templates:**
```typescript
// lib/responses/templates.ts
export const RESPONSE_TEMPLATES = {
  your_level: {
    adult: "...",
    minor: "..."
  }
};
```

---

## API Usage

See [API Documentation](static/docs/api-v1.md) for complete reference.

### Basic Example

```typescript
// Example 1: Explicit country (UK)
const result = await cite.evaluate({
  messages: [
    { role: 'user', content: "I can't do this anymore" }
  ],
  config: { user_country: 'GB' }
});

// Example 2: Language inference (Spanish → Mexico, Spain, etc.)
const result2 = await cite.evaluate({
  messages: [
    { role: 'user', content: "No puedo más con esto" }
  ],
  config: {} // No country - will infer from Spanish language
});

// Example 3: Free tier (no API key)
const result3 = await fetch('/api/v1/evaluate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  // No Authorization header - uses free tier
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Help me' }],
    config: {}
  })
});
```

---

## Deployment

### Netlify (Recommended)
```bash
# Already configured with adapter-netlify
# Just connect repo and add environment variables:
OPENROUTER_API_KEY=your_key_here
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...

# Deploy
netlify deploy --prod
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment guide.

### Self-Hosted
```bash
# Build
pnpm build

# Run with Node adapter
node build

# Or use Docker (coming soon)
```

---

## Contributing

This project is designed to be extracted and adapted. The code is intentionally modular:
- Each component is independent and testable
- Provider abstraction makes it easy to swap LLM backends
- All prompts centralized for easy review
- Extensive tests for validation

Feel free to:
- Add new crisis resources via admin panel
- Improve classification prompts
- Add new risk types
- Extend the API with custom fields

---

## License

MIT - See [LICENSE](LICENSE)

---

## Acknowledgments

- Built with SvelteKit, TypeScript, Supabase, and Vitest
- LLM classification via OpenRouter (Claude Haiku 4.5)
- Clinical framework inspired by C-SSRS and DSM-5
- Crisis resources from national organizations
- Research informed by work at CIP and weval.org

---

## Emergency Resources

**If you or someone you know is in crisis:**
- 🇺🇸 US: Call or text **988** (Suicide & Crisis Lifeline)
- 🌍 International: [findahelpline.com](https://findahelpline.com)
- 🚨 Emergency: Call your local emergency number (911, 999, etc.)

---

**Remember**: This API provides mental health safety infrastructure, not medical advice. Use does not constitute clinical services. Always direct users in crisis to emergency services (988/911). Lives are at stake—we have the tools, we just need to use them.
