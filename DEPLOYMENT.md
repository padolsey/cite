# Deploying CITE to Netlify

This project is configured for easy deployment to Netlify.

## Prerequisites

1. **GitHub repository** (or GitLab/Bitbucket)
2. **Netlify account** ([netlify.com](https://netlify.com))
3. **OpenRouter API key** ([openrouter.ai/keys](https://openrouter.ai/keys))

## Quick Deploy

### Option 1: Netlify UI (Recommended)

1. **Import from Git**
   - Go to [app.netlify.com](https://app.netlify.com)
   - Click "Add new site" > "Import an existing project"
   - Connect your Git provider and select this repository

2. **Build Settings** (should auto-detect)
   - Build command: `pnpm build`
   - Publish directory: `build`
   - Node version: 22.12.0 (specified in netlify.toml)

3. **Environment Variables**
   - Go to Site settings > Environment variables
   - Add: `OPENROUTER_API_KEY` = your key from OpenRouter
   - **Important**: This must be set before deploying!

4. **Deploy**
   - Click "Deploy site"
   - Wait 2-3 minutes for initial build
   - Your site will be live at `<random-name>.netlify.app`

### Option 2: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize site
netlify init

# Set environment variable
netlify env:set OPENROUTER_API_KEY "your-key-here"

# Deploy
netlify deploy --prod
```

## Configuration Files

### `netlify.toml` (Already Configured)

The project includes a `netlify.toml` with:
- Build settings
- Node 20 environment
- SvelteKit SSR redirects
- Security headers
- Static asset caching

### `svelte.config.js` (Already Configured)

Uses `@sveltejs/adapter-netlify` for optimal Netlify deployment.

## Post-Deployment

### Custom Domain (Optional)

1. Go to Site settings > Domain management
2. Add your custom domain
3. Configure DNS records as shown

### Rate Limiting

The cookie-based rate limiter works out of the box on Netlify:
- 60 requests/minute per session (cookie-based)
- 500 requests/minute per IP (very liberal for corporate environments)

### Monitoring

Check deployment logs:
- Netlify dashboard > Deploys > Click on a deploy
- View function logs in real-time
- Monitor bandwidth usage

## Environment Variables

Set these in Netlify UI (Site settings > Environment variables):

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | ✅ Yes | Your OpenRouter API key for LLM access |

## Troubleshooting

### Build Fails

**Error**: `OPENROUTER_API_KEY not found`
- **Fix**: Set the environment variable in Netlify UI before deploying

**Error**: `pnpm: command not found`
- **Fix**: Netlify should auto-detect pnpm. If not, add `.npmrc` with `use-pnpm=true`

**Error**: Node version mismatch
- **Fix**: `netlify.toml` specifies Node 22.12.0. Verify in build logs.
- Local development: Run `nvm use` (requires nvm and .nvmrc file)

### Rate Limiting Issues

**Users getting rate limited too easily**
- Edit `src/hooks.server.ts`
- Increase `rate: [60, 'm']` to `rate: [120, 'm']` (cookie limit)
- Increase `IP: [500, 'm']` to `IP: [1000, 'm']` (IP limit)
- Redeploy

**Rate limiting dialog appears immediately**
- This was a bug, now fixed with try-catch and preflight: false
- If still occurring, check server logs for rate limiter errors

**Rate limiting not working**
- Check that cookies are enabled in browser
- Verify `cite_rl` cookie is set (DevTools > Application > Cookies)

### Runtime Errors

**"Cannot connect to API"**
- Verify `OPENROUTER_API_KEY` is set in Netlify
- Check OpenRouter dashboard for API key status
- Look at function logs in Netlify dashboard

## Cost Considerations

### Netlify Free Tier
- 300 build minutes/month
- 100GB bandwidth/month
- Unlimited serverless function invocations
- **Should be sufficient for a demo**

### OpenRouter Costs
- Varies by model used
- Basic model (qwen3-30b): ~$0.10 per 1M tokens
- Careful model (claude-sonnet-4.5): ~$3 per 1M tokens
- **Monitor usage in OpenRouter dashboard**

Rate limiting helps control costs by preventing abuse.

## Continuous Deployment

Once set up, Netlify auto-deploys on:
- Every push to main branch
- Pull request previews (optional)

Disable auto-deploy:
- Site settings > Build & deploy > Build settings
- Stop builds / Edit build hooks

## Security

The `netlify.toml` includes security headers:
- `X-Frame-Options: DENY` (prevent clickjacking)
- `X-Content-Type-Options: nosniff` (prevent MIME sniffing)
- `Referrer-Policy: strict-origin-when-cross-origin`

Rate limiting protects against:
- API abuse
- Accidental infinite loops
- Cost overruns

## Production Checklist

Before sharing your deployed demo:

- [ ] Environment variable `OPENROUTER_API_KEY` set
- [ ] Site deploys successfully
- [ ] Test a chat interaction end-to-end
- [ ] Verify rate limiting works (send 35+ requests)
- [ ] Check OpenRouter usage dashboard
- [ ] Set up billing alerts in OpenRouter (optional)
- [ ] Review Netlify analytics (optional)

## Need Help?

- **Netlify Docs**: [docs.netlify.com](https://docs.netlify.com)
- **SvelteKit + Netlify**: [kit.svelte.dev/docs/adapter-netlify](https://kit.svelte.dev/docs/adapter-netlify)
- **OpenRouter**: [openrouter.ai/docs](https://openrouter.ai/docs)
