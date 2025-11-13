import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CITEEngine } from '$lib/../../lib/CITEEngine';
import type { Message, CITEConfig } from '$lib/../../lib/types';
import type { ProfileKey } from '$lib/../../lib/interception/Router';
import { OPENROUTER_API_KEY } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { messages, config, profile } = await request.json() as {
      messages: Message[];
      config: CITEConfig;
      profile: ProfileKey | 'auto';
    };

    // Get API key from environment
    const apiKey = OPENROUTER_API_KEY;
    if (!apiKey) {
      return json({ error: 'OPENROUTER_API_KEY not configured in .env file' }, { status: 500 });
    }

    // Create CITE engine
    const engine = new CITEEngine(apiKey, config);

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        function send(data: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }

        try {
          // Stream chat response with real-time process events
          for await (const chunk of engine.chat(messages, profile)) {
            send(chunk);
          }

          // Send final metadata
          const events = engine.getProcessEvents();
          send({
            type: 'metadata',
            metadata: {
              processEvents: events,
              totalDuration: events.length > 0
                ? events[events.length - 1].timestamp - events[0].timestamp
                : 0
            }
          });

          send({ type: 'done' });
          controller.close();
        } catch (error) {
          send({
            type: 'error',
            error: error instanceof Error ? error.message : String(error)
          });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
};
