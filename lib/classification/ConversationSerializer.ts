import type { Message } from '../providers/IProvider.js';

/**
 * Judge approaches control how we serialize a conversation into the XML
 * payload seen by the classifier LLM.
 *
 * - 'full_history'  : include all user + assistant turns
 * - 'only_latest'   : include only the latest user message
 * - 'user_tail_n'   : include the last N user messages
 * - 'truncated_ai'  : include all user turns, but only the last assistant turn
 */
export type JudgeApproach = 'full_history' | 'only_latest' | 'user_tail_n' | 'truncated_ai';

export type ConversationStyle = 'xml' | 'markdown' | 'visual_heavy';

export interface SerializeOptions {
  approach: JudgeApproach;
  style?: ConversationStyle;
  userTailCount?: number;
}

export function serializeConversation(
  messages: Message[],
  options: SerializeOptions
): string {
  const style: ConversationStyle = options.style ?? 'xml';

  if (style === 'markdown') {
    return buildMarkdownStyle(messages, options);
  }
  if (style === 'visual_heavy') {
    return buildVisualHeavyStyle(messages, options);
  }

  // Default XML style with namespaced tags
  switch (options.approach) {
    case 'only_latest':
      return buildOnlyLatestXml(messages);
    case 'user_tail_n':
      return buildUserTailXml(messages, options.userTailCount ?? 3);
    case 'truncated_ai':
      return buildTruncatedAiXml(messages);
    case 'full_history':
    default:
      return buildFullHistoryXml(messages);
  }
}

// -----------------------
// XML (default) style
// -----------------------

function buildFullHistoryXml(messages: Message[]): string {
  const lines: string[] = [];

  lines.push(
    'The following XML contains the conversation to analyze. ' +
      'Use all turns, but place extra emphasis on <CITE_LATEST_USER_TURN>.'
  );
  lines.push('');
  lines.push('<CITE_CONVERSATION>');

  let idx = 0;
  let latestUserIndex = -1;
  let latestUserContent = '';

  for (const msg of messages) {
    if (msg.role !== 'user' && msg.role !== 'assistant') continue;

    idx += 1;
    if (msg.role === 'user') {
      latestUserIndex = idx;
      latestUserContent = msg.content;
    }

    const escaped = escapeXml(msg.content);
    lines.push(`  <CITE_TURN index="${idx}" role="${msg.role}">${escaped}</CITE_TURN>`);
  }

  lines.push('</CITE_CONVERSATION>');

  if (latestUserIndex !== -1) {
    lines.push('');
    lines.push(
      `<CITE_LATEST_USER_TURN index="${latestUserIndex}">${escapeXml(
        latestUserContent
      )}</CITE_LATEST_USER_TURN>`
    );
  }

  return lines.join('\n');
}

function buildOnlyLatestXml(messages: Message[]): string {
  const lastUser = [...messages].reverse().find(m => m.role === 'user');

  const lines: string[] = [];
  lines.push(
    'The following XML contains the conversation to analyze. ' +
      'Only the latest user message is provided; focus on this turn.'
  );
  lines.push('');
  lines.push('<CITE_CONVERSATION>');

  if (lastUser) {
    const escaped = escapeXml(lastUser.content);
    lines.push(`  <CITE_TURN index="1" role="user">${escaped}</CITE_TURN>`);
  }

  lines.push('</CITE_CONVERSATION>');

  if (lastUser) {
    lines.push('');
    lines.push(
      `<CITE_LATEST_USER_TURN index="1">${escapeXml(
        lastUser.content
      )}</CITE_LATEST_USER_TURN>`
    );
  }

  return lines.join('\n');
}

function buildUserTailXml(messages: Message[], userTailCount: number): string {
  const userMessages = messages.filter(m => m.role === 'user');
  const tail = userMessages.slice(-userTailCount);

  const lines: string[] = [];
  lines.push(
    'The following XML contains the conversation to analyze. ' +
      `Only the last ${userTailCount} user messages are included, in order; ` +
      'assistant messages are omitted. Place extra emphasis on <CITE_LATEST_USER_TURN>.'
  );
  lines.push('');
  lines.push('<CITE_CONVERSATION>');

  let idx = 0;
  let latestUserIndex = -1;
  let latestUserContent = '';

  for (const msg of tail) {
    idx += 1;
    latestUserIndex = idx;
    latestUserContent = msg.content;

    const escaped = escapeXml(msg.content);
    lines.push(`  <CITE_TURN index="${idx}" role="user">${escaped}</CITE_TURN>`);
  }

  lines.push('</CITE_CONVERSATION>');

  if (latestUserIndex !== -1) {
    lines.push('');
    lines.push(
      `<CITE_LATEST_USER_TURN index="${latestUserIndex}">${escapeXml(
        latestUserContent
      )}</CITE_LATEST_USER_TURN>`
    );
  }

  return lines.join('\n');
}

function buildTruncatedAiXml(messages: Message[]): string {
  const lines: string[] = [];
  lines.push(
    'The following XML contains the conversation to analyze. ' +
      'All user turns are included; only the most recent assistant turn is retained.'
  );
  lines.push('');
  lines.push('<CITE_CONVERSATION>');

  let idx = 0;
  let latestUserIndex = -1;
  let latestUserContent = '';

  // Find last assistant index in original messages
  const lastAssistantIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return i;
    }
    return -1;
  })();

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === 'user') {
      idx += 1;
      latestUserIndex = idx;
      latestUserContent = msg.content;
      lines.push(
        `  <CITE_TURN index="${idx}" role="user">${escapeXml(
          msg.content
        )}</CITE_TURN>`
      );
    } else if (msg.role === 'assistant' && i === lastAssistantIndex) {
      idx += 1;
      lines.push(
        `  <CITE_TURN index="${idx}" role="assistant">${escapeXml(
          msg.content
        )}</CITE_TURN>`
      );
    }
  }

  lines.push('</CITE_CONVERSATION>');

  if (latestUserIndex !== -1) {
    lines.push('');
    lines.push(
      `<CITE_LATEST_USER_TURN index="${latestUserIndex}">${escapeXml(
        latestUserContent
      )}</CITE_LATEST_USER_TURN>`
    );
  }

  return lines.join('\n');
}

// -----------------------
// Markdown style
// -----------------------

function buildMarkdownStyle(messages: Message[], options: SerializeOptions): string {
  const approach = options.approach;
  // Reuse XML builders to select which messages are included,
  // then render them as markdown.

  // Normalize conversation subset according to approach
  let subset: Message[] = [];
  if (approach === 'only_latest') {
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    subset = lastUser ? [lastUser] : [];
  } else if (approach === 'user_tail_n') {
    const userMessages = messages.filter(m => m.role === 'user');
    subset = userMessages.slice(-(options.userTailCount ?? 3));
  } else if (approach === 'truncated_ai') {
    // all users + last assistant
    const lastAssistantIndex = (() => {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') return i;
      }
      return -1;
    })();

    subset = messages.filter(
      (m, idx) => m.role === 'user' || (m.role === 'assistant' && idx === lastAssistantIndex)
    );
  } else {
    subset = messages.slice();
  }

  const lines: string[] = [];
  lines.push('### CITE_CONVERSATION');
  lines.push('');

  let idx = 0;
  let latestUserIndex = -1;
  let latestUserContent = '';

  for (const msg of subset) {
    if (msg.role !== 'user' && msg.role !== 'assistant') continue;
    idx += 1;
    if (msg.role === 'user') {
      latestUserIndex = idx;
      latestUserContent = msg.content;
    }
    lines.push(`- [${idx}] role=${msg.role}: ${msg.content}`);
  }

  if (latestUserIndex !== -1) {
    lines.push('');
    lines.push('### CITE_LATEST_USER_TURN');
    lines.push('');
    lines.push(`- index=${latestUserIndex} role=user: ${latestUserContent}`);
  }

  return lines.join('\n');
}

// -----------------------
// Visual-heavy style
// -----------------------

function buildVisualHeavyStyle(messages: Message[], options: SerializeOptions): string {
  const approach = options.approach;

  let subset: Message[] = [];
  if (approach === 'only_latest') {
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    subset = lastUser ? [lastUser] : [];
  } else if (approach === 'user_tail_n') {
    const userMessages = messages.filter(m => m.role === 'user');
    subset = userMessages.slice(-(options.userTailCount ?? 3));
  } else if (approach === 'truncated_ai') {
    const lastAssistantIndex = (() => {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') return i;
      }
      return -1;
    })();

    subset = messages.filter(
      (m, idx) => m.role === 'user' || (m.role === 'assistant' && idx === lastAssistantIndex)
    );
  } else {
    subset = messages.slice();
  }

  const sep = '────────────────────────────────────────────────────────';
  const lines: string[] = [];

  lines.push(sep);
  lines.push('CITE_CONVERSATION');
  lines.push(sep);
  lines.push('');

  let idx = 0;
  let latestUserIndex = -1;
  let latestUserContent = '';

  for (const msg of subset) {
    if (msg.role !== 'user' && msg.role !== 'assistant') continue;
    idx += 1;
    if (msg.role === 'user') {
      latestUserIndex = idx;
      latestUserContent = msg.content;
    }
    lines.push(`  [${idx}] ${msg.role}: ${msg.content}`);
  }

  if (latestUserIndex !== -1) {
    lines.push('');
    lines.push(sep);
    lines.push('CITE_LATEST_USER_TURN');
    lines.push(sep);
    lines.push('');
    lines.push(`  [${latestUserIndex}] user: ${latestUserContent}`);
  }

  return lines.join('\n');
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}


