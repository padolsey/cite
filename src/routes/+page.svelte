<script lang="ts">
  import AuthModal from '$lib/components/AuthModal.svelte';

  let showAuthModal = $state(false);

  let stats = [
    { value: '1M+', label: 'Weekly crisis conversations in AI chat (OpenAI, 2024)' },
    { value: '<15%', label: 'Apps with MH-specific safety layers' },
    { value: '0', label: 'Open-source MH triage APIs (until now)' }
  ];

  let features = [
    {
      icon: '📊',
      title: 'Conversation-Aware Risk Detection',
      description: 'Not just "self-harm: yes/no" — track ideation levels, trends, and history across the full conversation with confidence scores.'
    },
    {
      icon: '🎯',
      title: 'Clinically-Grounded Taxonomy',
      description: 'Severity indicators inspired by C-SSRS structure and DSM-5 criteria. Transparent methodology, not a black box.'
    },
    {
      icon: '🛡️',
      title: 'Actionable Escalation Plans',
      description: 'Get specific actions (show resources, block method advice, notify human), constraints, and template text you can use directly.'
    },
    {
      icon: '🌍',
      title: 'Regional Crisis Resources',
      description: 'Auto-resolved crisis lines and support services based on location. Always current, properly localized.'
    },
    {
      icon: '📝',
      title: 'Audit Trail & Compliance',
      description: 'Structured logs for governance, test suites for validation, webhooks for human escalation. Built for regulated environments.'
    },
    {
      icon: '🔓',
      title: 'Open Source & Self-Hostable',
      description: 'Transparent, auditable, and can run entirely on your infrastructure. No vendor lock-in, no black boxes.'
    }
  ];

  let useCases = [
    {
      type: 'AI Companion Apps',
      companies: 'Replika, Character.AI, etc.',
      needs: 'High emotional engagement + young users = high MH exposure'
    },
    {
      type: 'Mental Health Chatbots',
      companies: 'Wysa, Woebot, Sonia',
      needs: 'Direct MH focus requires robust crisis detection'
    },
    {
      type: 'Healthcare Conversational AI',
      companies: 'Symptom checkers, patient education',
      needs: 'People disclose distress in health contexts'
    },
    {
      type: 'Education Platforms',
      companies: 'Tutoring bots, student-facing AI',
      needs: 'Students share mental health struggles'
    },
    {
      type: 'HR & Wellness Tools',
      companies: 'Employee assistance, benefits bots',
      needs: 'Employees ask about burnout, MH resources'
    }
  ];

  let codeExample = `import { CITEClient } from '@cite-safety/client';

const cite = new CITEClient({
  apiKey: process.env.CITE_API_KEY
});

const result = await cite.evaluate({
  messages: conversationHistory,
  new_message: userInput,
  risk_state: savedRiskState,
  config: {
    policy_id: 'default_mh',
    user_country: 'US'
  }
});

// Get structured risk assessment with confidence
console.log(result.risk_level);      // "high"
console.log(result.confidence);      // 0.87
console.log(result.suicide_severity); // 3 (inspired by C-SSRS)

// Use escalation guidance
if (result.risk_level === 'critical') {
  await showCrisisUI(result.escalation_plan.template_messages);
  await notifySafetyTeam(result);
}

// Save updated risk state
await db.saveRiskState(conversationId, result.risk_state);`;

  let comparison = [
    {
      aspect: 'Scope',
      generic: 'Single-message classification',
      cite: 'Conversation-level risk tracking'
    },
    {
      aspect: 'Granularity',
      generic: '"Self-harm: Yes/No" binary',
      cite: 'Severity levels (0-5) with confidence'
    },
    {
      aspect: 'Guidance',
      generic: 'Block or allow',
      cite: 'Graduated escalation + specific actions'
    },
    {
      aspect: 'Context',
      generic: 'Static thresholds',
      cite: 'Trend detection, conversation-aware'
    },
    {
      aspect: 'Output',
      generic: 'Label + score',
      cite: 'Actions + constraints + templates + resources'
    },
    {
      aspect: 'Clinical Grounding',
      generic: 'General harm taxonomy',
      cite: 'C-SSRS-inspired + DSM-5 informed'
    },
    {
      aspect: 'Transparency',
      generic: 'Black box',
      cite: 'Open source, confidence scores, clear limitations'
    }
  ];
</script>

<svelte:head>
  <title>CITE Safety - Mental Health Safety for AI Chat</title>
  <meta name="description" content="Drop-in middleware that detects crisis situations in AI chat and provides clinically-grounded escalation guidance. Open source and self-hostable." />
</svelte:head>

<div class="min-h-screen bg-white">
  <!-- Header -->
  <header class="border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-sm">
            C
          </div>
          <span class="font-semibold text-gray-900">CITE Safety</span>
        </div>

        <nav class="flex items-center gap-6">
          <a href="/docs" class="text-sm text-gray-600 hover:text-gray-900">
            Docs
          </a>
          <a href="/chat-demo-sandbox" class="text-sm text-gray-600 hover:text-gray-900">
            Demo
          </a>
          <a
            href="https://github.com/cite-safety/cite"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-gray-600 hover:text-gray-900"
          >
            GitHub
          </a>
          <button
            onclick={() => (showAuthModal = true)}
            class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get Started
          </button>
        </nav>
      </div>
    </div>
  </header>

  <!-- Hero -->
  <section class="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto">
      <div class="text-center max-w-3xl mx-auto">
        <h1 class="text-5xl font-bold text-gray-900 mb-6">
          Mental Health Safety for AI Conversations
        </h1>
        <p class="text-xl text-gray-600 mb-8">
          Drop-in middleware that detects crisis situations in AI chat and provides
          clinically-grounded escalation guidance. Open source and self-hostable.
        </p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onclick={() => (showAuthModal = true)}
            class="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            Get Started →
          </button>
          <a
            href="/docs"
            class="px-8 py-3 bg-white text-gray-700 font-semibold rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-colors"
          >
            Read Documentation
          </a>
        </div>
        <p class="text-sm text-gray-500 mt-4">
          10,000 evaluations/month free • No credit card required
        </p>
      </div>

      <!-- Stats -->
      <div class="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        {#each stats as stat}
          <div class="text-center">
            <div class="text-4xl font-bold text-blue-600 mb-2">{stat.value}</div>
            <div class="text-sm text-gray-600">{stat.label}</div>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- The Problem -->
  <section class="py-16 bg-gray-50 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto">
      <div class="max-w-3xl mx-auto text-center mb-12">
        <h2 class="text-3xl font-bold text-gray-900 mb-4">
          AI Chat Has a Mental Health Problem
        </h2>
        <p class="text-lg text-gray-600">
          AI companions, wellness bots, and healthcare chat are everywhere.
          Most have no MH-specific safety layer beyond generic filters.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <div class="bg-white rounded-lg p-6 border-l-4 border-red-500">
          <h3 class="font-semibold text-gray-900 mb-2">❌ Generic Content Moderation</h3>
          <ul class="text-sm text-gray-600 space-y-2">
            <li>• Can't distinguish venting from active planning</li>
            <li>• Treats each message independently (no conversation context)</li>
            <li>• Provides no escalation guidance beyond "block or allow"</li>
            <li>• Misses critical nuance in mental health language</li>
          </ul>
        </div>

        <div class="bg-white rounded-lg p-6 border-l-4 border-green-500">
          <h3 class="font-semibold text-gray-900 mb-2">✓ CITE Mental Health Safety</h3>
          <ul class="text-sm text-gray-600 space-y-2">
            <li>• Tracks risk over full conversation with trend detection</li>
            <li>• Severity levels (0-5) with confidence scores</li>
            <li>• Actionable plans: show resources, block advice, notify human</li>
            <li>• Clinically-grounded taxonomy inspired by C-SSRS & DSM-5</li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <!-- How It Works -->
  <section class="py-16 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-12">
        <h2 class="text-3xl font-bold text-gray-900 mb-4">
          Conversation-Aware Mental Health Safety
        </h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {#each features as feature}
          <div class="bg-gray-50 rounded-lg p-6">
            <div class="text-3xl mb-3">{feature.icon}</div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
            <p class="text-sm text-gray-600">{feature.description}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Code Example -->
  <section class="py-16 bg-gray-900 text-white px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto">
      <div class="max-w-3xl mx-auto mb-12 text-center">
        <h2 class="text-3xl font-bold mb-4">Simple Integration</h2>
        <p class="text-gray-300">
          Drop-in middleware for any chat application. Works with any LLM or assistant backend.
        </p>
      </div>

      <div class="max-w-4xl mx-auto">
        <div class="bg-gray-800 rounded-lg overflow-hidden">
          <div class="flex items-center justify-between px-4 py-2 bg-gray-700 border-b border-gray-600">
            <span class="text-sm text-gray-300 font-mono">example.ts</span>
            <button
              onclick={(e) => {
                navigator.clipboard.writeText(codeExample);
                const btn = e.target;
                btn.textContent = '✓ Copied';
                setTimeout(() => btn.textContent = 'Copy', 2000);
              }}
              class="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Copy
            </button>
          </div>
          <pre class="p-6 overflow-x-auto text-sm"><code>{codeExample}</code></pre>
        </div>
      </div>
    </div>
  </section>

  <!-- Who It's For -->
  <section class="py-16 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-12">
        <h2 class="text-3xl font-bold text-gray-900 mb-4">
          Built for Teams Building AI Chat
        </h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {#each useCases as useCase}
          <div class="bg-white rounded-lg p-6 border border-gray-200 hover:border-blue-500 transition-colors">
            <h3 class="font-semibold text-gray-900 mb-1">{useCase.type}</h3>
            <p class="text-xs text-gray-500 mb-3">{useCase.companies}</p>
            <p class="text-sm text-gray-600">{useCase.needs}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Comparison Table -->
  <section class="py-16 bg-gray-50 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-12">
        <h2 class="text-3xl font-bold text-gray-900 mb-4">
          Why Different from Content Moderation?
        </h2>
      </div>

      <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="bg-gray-100 border-b border-gray-200">
              <th class="px-6 py-3 text-left text-sm font-semibold text-gray-900">Aspect</th>
              <th class="px-6 py-3 text-left text-sm font-semibold text-gray-600">Generic Moderation</th>
              <th class="px-6 py-3 text-left text-sm font-semibold text-blue-600">CITE Safety</th>
            </tr>
          </thead>
          <tbody>
            {#each comparison as row}
              <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="px-6 py-4 text-sm font-medium text-gray-900">{row.aspect}</td>
                <td class="px-6 py-4 text-sm text-gray-600">{row.generic}</td>
                <td class="px-6 py-4 text-sm text-blue-700 font-medium">{row.cite}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- Transparency & Limitations -->
  <section class="py-16 px-4 sm:px-6 lg:px-8 border-t border-gray-200">
    <div class="max-w-7xl mx-auto">
      <div class="max-w-3xl mx-auto">
        <h2 class="text-3xl font-bold text-gray-900 mb-8 text-center">
          Honest About Limitations
        </h2>

        <div class="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-6 mb-8">
          <h3 class="font-semibold text-amber-900 mb-3">What This API Is NOT</h3>
          <ul class="space-y-2 text-sm text-amber-800">
            <li>❌ <strong>Not a diagnostic tool</strong> - Only clinicians can diagnose</li>
            <li>❌ <strong>Not a replacement for clinical care</strong> - Triage guidance, not treatment</li>
            <li>❌ <strong>Not perfect</strong> - ~15% of critical cases may be misclassified</li>
            <li>❌ <strong>Not emergency intervention</strong> - Redirect to 988/911 for crises</li>
            <li>❌ <strong>Not C-SSRS equivalent</strong> - Severity scale inspired by structure, not a formal assessment</li>
          </ul>
        </div>

        <div class="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-6">
          <h3 class="font-semibold text-blue-900 mb-3">What This API Does</h3>
          <ul class="space-y-2 text-sm text-blue-800">
            <li>✓ <strong>Detects patterns</strong> associated with elevated mental health risk</li>
            <li>✓ <strong>Provides triage guidance</strong> to help route users appropriately</li>
            <li>✓ <strong>Connects to resources</strong> - regional crisis lines and support</li>
            <li>✓ <strong>Supports decisions</strong> - helps humans make better calls</li>
            <li>✓ <strong>Includes confidence scores</strong> - transparent about uncertainty</li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <!-- Pricing -->
  <section class="py-16 bg-gray-50 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-12">
        <h2 class="text-3xl font-bold text-gray-900 mb-4">
          Free for Most Use Cases
        </h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <!-- Free Tier -->
        <div class="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-8">
          <div class="text-center mb-6">
            <h3 class="text-xl font-bold text-gray-900 mb-2">Free</h3>
            <div class="text-4xl font-bold text-gray-900 mb-1">$0</div>
            <div class="text-sm text-gray-600">Forever free</div>
          </div>
          <ul class="space-y-3 text-sm text-gray-700 mb-8">
            <li class="flex items-start gap-2">
              <svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>10,000 evaluations/month</span>
            </li>
            <li class="flex items-start gap-2">
              <svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>All core features</span>
            </li>
            <li class="flex items-start gap-2">
              <svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Community support</span>
            </li>
            <li class="flex items-start gap-2">
              <svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>No credit card</span>
            </li>
          </ul>
          <button
            onclick={() => (showAuthModal = true)}
            class="block w-full text-center px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
          >
            Get Started
          </button>
        </div>

        <!-- Pro Tier -->
        <div class="bg-white rounded-lg shadow-sm border-2 border-blue-500 p-8 relative">
          <div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
            POPULAR
          </div>
          <div class="text-center mb-6">
            <h3 class="text-xl font-bold text-gray-900 mb-2">Pro</h3>
            <div class="text-4xl font-bold text-gray-900 mb-1">$99</div>
            <div class="text-sm text-gray-600">per month</div>
          </div>
          <ul class="space-y-3 text-sm text-gray-700 mb-8">
            <li class="flex items-start gap-2">
              <svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>100,000 evaluations/month</span>
            </li>
            <li class="flex items-start gap-2">
              <svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Webhooks for escalation</span>
            </li>
            <li class="flex items-start gap-2">
              <svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Custom policies</span>
            </li>
            <li class="flex items-start gap-2">
              <svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Email support</span>
            </li>
          </ul>
          <button
            onclick={() => (showAuthModal = true)}
            class="block w-full text-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get Started
          </button>
        </div>

        <!-- Enterprise Tier -->
        <div class="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-8">
          <div class="text-center mb-6">
            <h3 class="text-xl font-bold text-gray-900 mb-2">Enterprise</h3>
            <div class="text-4xl font-bold text-gray-900 mb-1">Custom</div>
            <div class="text-sm text-gray-600">Contact us</div>
          </div>
          <ul class="space-y-3 text-sm text-gray-700 mb-8">
            <li class="flex items-start gap-2">
              <svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Self-hosting license</span>
            </li>
            <li class="flex items-start gap-2">
              <svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Unlimited evaluations</span>
            </li>
            <li class="flex items-start gap-2">
              <svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Dedicated support + SLAs</span>
            </li>
            <li class="flex items-start gap-2">
              <svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Professional services</span>
            </li>
          </ul>
          <a
            href="mailto:enterprise@cite-safety.io"
            class="block text-center px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
          >
            Contact Sales
          </a>
        </div>
      </div>

      <p class="text-center text-sm text-gray-600 mt-8">
        Open source library is MIT licensed and free to use forever.
      </p>
    </div>
  </section>

  <!-- CTA -->
  <section class="py-20 bg-blue-600 text-white px-4 sm:px-6 lg:px-8">
    <div class="max-w-4xl mx-auto text-center">
      <h2 class="text-4xl font-bold mb-4">
        Start Building Safer AI Chat Today
      </h2>
      <p class="text-xl text-blue-100 mb-8">
        Free tier covers most applications. No credit card required.
      </p>
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onclick={() => (showAuthModal = true)}
          class="px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-lg"
        >
          Get Started →
        </button>
        <a
          href="/chat-demo-sandbox"
          class="px-8 py-4 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-400 transition-colors border-2 border-blue-400"
        >
          Try Live Demo
        </a>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div>
          <div class="flex items-center gap-2 mb-4">
            <div class="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-sm">
              C
            </div>
            <span class="font-semibold text-white">CITE Safety</span>
          </div>
          <p class="text-sm">
            Mental health safety infrastructure for conversational AI.
          </p>
        </div>

        <div>
          <h3 class="text-white font-semibold mb-3">Product</h3>
          <ul class="space-y-2 text-sm">
            <li><a href="/docs" class="hover:text-white">Documentation</a></li>
            <li><a href="/api-sandbox" class="hover:text-white">API Sandbox</a></li>
            <li><a href="/chat-demo-sandbox" class="hover:text-white">Demo</a></li>
            <li><a href="/docs#11-rate-limiting" class="hover:text-white">Pricing</a></li>
          </ul>
        </div>

        <div>
          <h3 class="text-white font-semibold mb-3">Resources</h3>
          <ul class="space-y-2 text-sm">
            <li><a href="https://github.com/cite-safety/cite" class="hover:text-white">GitHub</a></li>
            <li><a href="https://blog.j11y.io/2025-11-13_CITE-AI-Safety/" class="hover:text-white">Blog Post</a></li>
            <li><a href="/docs#16-clinical-limitations" class="hover:text-white">Limitations</a></li>
          </ul>
        </div>

        <div>
          <h3 class="text-white font-semibold mb-3">Emergency</h3>
          <ul class="space-y-2 text-sm">
            <li>US: 988 Suicide & Crisis Lifeline</li>
            <li>International: <a href="https://findahelpline.com" target="_blank" class="hover:text-white">findahelpline.com</a></li>
          </ul>
        </div>
      </div>

      <div class="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
        <p>© 2025 CITE Safety. Open source under MIT License.</p>
        <div class="flex items-center gap-6">
          <a href="/docs#13-data-handling--privacy" class="hover:text-white">Privacy</a>
          <a href="/docs#16-clinical-limitations" class="hover:text-white">Terms</a>
          <a href="mailto:support@cite-safety.io" class="hover:text-white">Contact</a>
        </div>
      </div>

      <div class="mt-8 pt-8 border-t border-gray-800 text-xs text-center text-gray-500">
        <p>
          <strong>Disclaimer:</strong> This API provides mental health safety infrastructure, not medical advice.
          Use does not constitute clinical services. Always direct users in crisis to emergency services (988/911).
        </p>
      </div>
    </div>
  </footer>
</div>

<AuthModal bind:isOpen={showAuthModal} onClose={() => (showAuthModal = false)} />

<style>
  /* Ensure smooth animations */
  a, button {
    transition: all 0.2s ease-in-out;
  }

  /* Syntax highlighting for code */
  pre {
    font-family: 'Courier New', monospace;
  }

  code {
    color: #e5e7eb;
  }
</style>
