/**
 * /v1/evaluate endpoint
 *
 * Evaluates conversation for safety risks
 * Returns risk assessment, safe responses, and crisis resources
 *
 * Simple by default, progressively enhanced
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OPENROUTER_API_KEY } from '$env/static/private';
import { validateApiKey } from '$lib/auth/api-keys';
import { Evaluator } from '$lib/../../lib/evaluation/Evaluator.js';
import { RiskClassifier } from '$lib/../../lib/classification/RiskClassifier.js';
import { DatabaseResourceResolver } from '$lib/../../lib/resources/DatabaseResourceResolver.js';
import { OpenRouterProvider } from '$lib/../../lib/providers/OpenRouterProvider.js';
import type { EvaluateRequest, EvaluateResponse } from '$lib/../../lib/evaluation/types.js';
import { getSupabaseAdmin } from '$lib/auth/supabase-admin';

/**
 * POST /v1/evaluate
 *
 * Evaluate conversation for safety risks
 */
export const POST: RequestHandler = async ({ request }) => {
  try {
    // 1. Check for CITE API key (optional - free tier available)
    const authHeader = request.headers.get('Authorization');
    let userId: string | null = null;
    let isFreeAccess = true;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const citeApiKey = authHeader.substring(7); // Remove "Bearer " prefix
      userId = await validateApiKey(citeApiKey);

      if (!userId) {
        return json({ error: 'Invalid or revoked API key' }, { status: 401 });
      }

      isFreeAccess = false;
    }

    // Note: Rate limiting is handled globally in hooks.server.ts
    // Free tier: 60 req/min per session + 500 req/min per IP
    // Authenticated tier: same limits but tracked per user

    // 2. Parse request body
    const body = (await request.json()) as EvaluateRequest;

    // 3. Validate required fields
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return json({ error: 'messages is required and must be a non-empty array' }, { status: 400 });
    }

    if (!body.config) {
      return json({ error: 'config is required' }, { status: 400 });
    }

    // Note: user_country is now optional - will use language inference if not provided

    // Validate message format
    for (const msg of body.messages) {
      if (!msg.role || !msg.content) {
        return json(
          { error: 'Each message must have role and content fields' },
          { status: 400 }
        );
      }
      if (msg.role !== 'user' && msg.role !== 'assistant') {
        return json(
          { error: 'Message role must be "user" or "assistant"' },
          { status: 400 }
        );
      }
    }

    // 4. Get OpenRouter API key from environment
    const openRouterApiKey = OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return json(
        { error: 'OPENROUTER_API_KEY not configured in .env file' },
        { status: 500 }
      );
    }

    // 5. Create dependencies
    const provider = new OpenRouterProvider(openRouterApiKey);

    // Use multiple judges if requested in config
    const classifier = new RiskClassifier(provider, {
      useMultipleJudges: body.config.use_multiple_judges,
    });

    // Use database-backed resource resolver with Supabase admin client
    const supabase = getSupabaseAdmin();
    const resourceResolver = new DatabaseResourceResolver(supabase);

    const evaluator = new Evaluator({
      classifier,
      resourceResolver,
      provider,
    });

    // 6. Evaluate (with dry run check)
    if (body.config.dry_run) {
      // Dry run: evaluate but don't log/trigger webhooks
      // For now, just add a note in response
      // TODO: Implement proper dry run handling (skip logging, webhooks, etc.)
    }

    const response: EvaluateResponse = await evaluator.evaluate(body);

    // 7. Return response
    return json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error in /v1/evaluate:', error);

    // Return appropriate error response
    if (error instanceof SyntaxError) {
      return json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    return json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};
