import { RateLimiter } from 'sveltekit-rate-limiter/server';
import type { Handle } from '@sveltejs/kit';

// Cookie-based rate limiting for the demo
// Tracks individual sessions rather than IPs (avoids NAT/shared IP issues)
const limiter = new RateLimiter({
  cookie: {
    name: 'cite_rl',
    secret: 'cite-demo-rate-limit-secret-change-in-production',
    rate: [60, 'm'],      // 60 requests per minute per session
    preflight: false      // Don't count preflight requests
  },
  // Very generous IP limit for corporate environments (100 users * 0.5 req/min = 50/min)
  // Only kicks in when cookies work AND IP limit exceeded
  IP: [500, 'm']          // 500 per minute per IP (very liberal for shared IPs)
});

export const handle: Handle = async ({ event, resolve }) => {
  // Only rate limit API routes (not static assets)
  if (event.url.pathname.startsWith('/api/')) {
    try {
      const status = await limiter.check(event);

      // Only block if actually limited (not on first request)
      if (status.limited) {
        console.log('Rate limit hit:', status);
        return new Response(
          JSON.stringify({
            error: 'Too many requests',
            message: 'Please slow down. You can try again in a moment.',
            retryAfter: 60 // 1 minute retry
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '60'
            }
          }
        );
      }
    } catch (error) {
      // If rate limiter fails, allow the request through
      console.error('Rate limiter error:', error);
    }
  }

  return resolve(event);
};
