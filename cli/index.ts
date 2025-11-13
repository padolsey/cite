#!/usr/bin/env node

import { createInterface } from 'readline';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { CITEEngine } from '../lib/CITEEngine.js';
import type { Message, CITEConfig, ProcessEvent } from '../lib/types/index.js';
import type { ProfileKey } from '../lib/interception/Router.js';

// Load .env file
try {
  const envPath = resolve(process.cwd(), '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
} catch (e) {
  // .env file not found or couldn't be read - that's ok, might be set in environment
}

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  blue: '\x1b[34m',
  green: '\x1b[32m',
  purple: '\x1b[35m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',

  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgPurple: '\x1b[45m',
  bgRed: '\x1b[41m',
};

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

function printBanner() {
  console.log('\n' + colorize('═══════════════════════════════════════════════════════', 'cyan'));
  console.log(colorize('   CITE Demo CLI', 'bright'));
  console.log(colorize('   Context • Interception • Thinking • Escalation', 'dim'));
  console.log(colorize('═══════════════════════════════════════════════════════\n', 'cyan'));
}

function printHelp() {
  console.log(colorize('\nCommands:', 'bright'));
  console.log('  /help     - Show this help');
  console.log('  /config   - Show current configuration');
  console.log('  /profile <basic|balanced|careful|auto> - Set model profile');
  console.log('  /thinking <on|off> - Toggle thinking display');
  console.log('  /context <on|off> - Toggle context synthesis');
  console.log('  /safety <on|off> - Toggle safety messaging');
  console.log('  /clear    - Clear conversation');
  console.log('  /exit     - Exit CLI\n');
}

function printConfig(config: CITEConfig, profile: ProfileKey | 'auto') {
  console.log(colorize('\n📋 Current Configuration:', 'bright'));
  console.log(colorize('  Profile: ', 'dim') + profile);
  console.log(colorize('  Context Management:', 'blue'));
  console.log(`    • Synthesis: ${config.enableContextSynthesis ? '✓' : '✗'}`);
  console.log(`    • Max tokens: ${config.maxContextTokens}`);
  console.log(`    • Synthesis interval: ${config.synthesisInterval} messages`);
  console.log(colorize('  Interception:', 'green'));
  console.log(`    • Routing: ${config.enableRouting ? '✓' : '✗'}`);
  console.log(`    • Delegation: ${config.enableDelegation ? '✓' : '✗'}`);
  console.log(colorize('  Thinking:', 'purple'));
  console.log(`    • Enabled: ${config.enableThinking ? '✓' : '✗'}`);
  console.log(`    • Style: ${config.thinkingStyle}`);
  console.log(colorize('  Escalation:', 'red'));
  console.log(`    • Safety messaging: ${config.enableSafetyMessaging ? '✓' : '✗'}`);
  console.log(`    • Upskilling: ${config.enableUpskilling ? '✓' : '✗'}`);
  console.log('');
}

function printProcessEvent(event: ProcessEvent) {
  const icons = {
    context: '📚',
    interception: '🛡️',
    thinking: '💭',
    escalation: '⚠️'
  };

  const colorMap = {
    context: 'blue',
    interception: 'green',
    thinking: 'purple',
    escalation: 'red'
  } as const;

  const icon = icons[event.type as keyof typeof icons] || '•';
  const color = colorMap[event.type as keyof typeof colorMap] || 'gray';

  console.log(colorize(`\n${icon} [${event.type.toUpperCase()}]`, color) + ' ' + event.description);

  if (event.data) {
    const dataStr = JSON.stringify(event.data, null, 2);
    const lines = dataStr.split('\n');
    lines.forEach(line => {
      console.log(colorize('  │ ', 'gray') + colorize(line, 'dim'));
    });
  }

  if (event.duration) {
    const durationStr = event.duration < 1000
      ? `${event.duration}ms`
      : `${(event.duration / 1000).toFixed(2)}s`;
    console.log(colorize(`  └─ ${durationStr}`, 'gray'));
  }
}

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error(colorize('❌ Error: OPENROUTER_API_KEY environment variable not set', 'red'));
    console.error('Please set it in your .env file or export it:\n');
    console.error('  export OPENROUTER_API_KEY=your_key_here\n');
    process.exit(1);
  }

  printBanner();

  // Parse CLI args
  const args = process.argv.slice(2);
  const showProcesses = !args.includes('--no-process');
  const showThinking = !args.includes('--no-thinking');

  // Default config
  let config: CITEConfig = {
    enableContextSynthesis: true,
    maxContextTokens: 4000,
    synthesisInterval: 10,
    enableRouting: true,
    enableDelegation: false,
    enableThinking: showThinking,
    thinkingStyle: 'detailed',
    enableSafetyMessaging: true,
    enableUpskilling: true
  };

  let profile: ProfileKey | 'auto' = 'auto';
  let messages: Message[] = [];
  let displayThinking = showThinking;
  let displayProcesses = showProcesses;

  console.log(colorize('Type /help for commands or start chatting!\n', 'dim'));
  if (!showProcesses) {
    console.log(colorize('💡 Process events hidden (use without --no-process to see them)\n', 'yellow'));
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: colorize('You> ', 'cyan')
  });

  rl.prompt();

  rl.on('line', async (input) => {
    const trimmed = input.trim();

    if (!trimmed) {
      rl.prompt();
      return;
    }

    // Handle commands
    if (trimmed.startsWith('/')) {
      const [cmd, ...argsParts] = trimmed.slice(1).split(' ');
      const cmdArg = argsParts.join(' ');

      switch (cmd) {
        case 'help':
          printHelp();
          rl.prompt();
          return;

        case 'config':
          printConfig(config, profile);
          rl.prompt();
          return;

        case 'profile':
          if (['basic', 'balanced', 'careful', 'auto'].includes(cmdArg)) {
            profile = cmdArg as ProfileKey | 'auto';
            console.log(colorize(`✓ Profile set to: ${profile}\n`, 'green'));
          } else {
            console.log(colorize('❌ Invalid profile. Use: basic, balanced, careful, or auto\n', 'red'));
          }
          rl.prompt();
          return;

        case 'thinking':
          if (cmdArg === 'on') {
            displayThinking = true;
            config.enableThinking = true;
            console.log(colorize('✓ Thinking display enabled\n', 'green'));
          } else if (cmdArg === 'off') {
            displayThinking = false;
            config.enableThinking = false;
            console.log(colorize('✓ Thinking display disabled\n', 'green'));
          } else {
            console.log(colorize('❌ Use: /thinking on or /thinking off\n', 'red'));
          }
          rl.prompt();
          return;

        case 'context':
          if (cmdArg === 'on') {
            config.enableContextSynthesis = true;
            console.log(colorize('✓ Context synthesis enabled\n', 'green'));
          } else if (cmdArg === 'off') {
            config.enableContextSynthesis = false;
            console.log(colorize('✓ Context synthesis disabled\n', 'green'));
          } else {
            console.log(colorize('❌ Use: /context on or /context off\n', 'red'));
          }
          rl.prompt();
          return;

        case 'safety':
          if (cmdArg === 'on') {
            config.enableSafetyMessaging = true;
            console.log(colorize('✓ Safety messaging enabled\n', 'green'));
          } else if (cmdArg === 'off') {
            config.enableSafetyMessaging = false;
            console.log(colorize('✓ Safety messaging disabled\n', 'green'));
          } else {
            console.log(colorize('❌ Use: /safety on or /safety off\n', 'red'));
          }
          rl.prompt();
          return;

        case 'clear':
          messages = [];
          console.log(colorize('✓ Conversation cleared\n', 'green'));
          rl.prompt();
          return;

        case 'exit':
          console.log(colorize('\nGoodbye! 👋\n', 'cyan'));
          process.exit(0);

        default:
          console.log(colorize(`❌ Unknown command: /${cmd}\n`, 'red'));
          rl.prompt();
          return;
      }
    }

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: trimmed,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };

    messages.push(userMessage);

    // Create engine and process
    const engine = new CITEEngine(apiKey, config);

    console.log(''); // Blank line before processing

    try {
      let responseContent = '';
      let currentThinking = '';

      for await (const chunk of engine.chat(messages, profile)) {
        if (chunk.type === 'content' && chunk.content) {
          responseContent += chunk.content;
          process.stdout.write(chunk.content);
        } else if (chunk.type === 'thinking' && chunk.thinking && displayThinking) {
          currentThinking = chunk.thinking;
        } else if (chunk.type === 'error') {
          console.error(colorize(`\n❌ Error: ${chunk.error}`, 'red'));
        }
      }

      console.log('\n'); // Blank line after response

      // Show thinking if any
      if (currentThinking && displayThinking) {
        console.log(colorize('💭 Internal Thinking:', 'purple'));
        const thinkingLines = currentThinking.split('\n');
        thinkingLines.forEach(line => {
          console.log(colorize('  │ ', 'gray') + colorize(line, 'dim'));
        });
        console.log('');
      }

      // Show process events
      if (displayProcesses) {
        const events = engine.getProcessEvents();
        if (events.length > 0) {
          console.log(colorize('─────────────────────────────────────────────', 'gray'));
          console.log(colorize('📊 Process Events:', 'bright'));
          events.forEach(event => printProcessEvent(event));
          console.log(colorize('─────────────────────────────────────────────', 'gray'));
          console.log('');
        }
      }

      // Add assistant message to history
      if (responseContent) {
        messages.push({
          role: 'assistant',
          content: responseContent,
          id: crypto.randomUUID(),
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error(colorize(`\n❌ Error: ${error}`, 'red'));
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log(colorize('\nGoodbye! 👋\n', 'cyan'));
    process.exit(0);
  });
}

main().catch(error => {
  console.error(colorize(`Fatal error: ${error}`, 'red'));
  process.exit(1);
});
