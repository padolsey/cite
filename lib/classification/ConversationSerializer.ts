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

export interface SerializeOptions {
  approach: JudgeApproach;
  userTailCount?: number;
}

export function serializeConversation(
  messages: Message[],
  options: SerializeOptions
): string {
  switch (options.approach) {
    case 'only_latest':
      return buildOnlyLatest(messages);
    case 'user_tail_n':
      return buildUserTail(messages, options.userTailCount ?? 3);
    case 'truncated_ai':
      return buildTruncatedAi(messages);
    case 'full_history':
    default:
      return buildFullHistory(messages);
  }
}

function buildFullHistory(messages: Message[]): string {
  const lines: string[] = [];

  lines.push(
    'The following XML contains the conversation to analyze. ' +
      'Use all turns, but place extra emphasis on <latest_user_turn>.'
  );
  lines.push('');
  lines.push('<conversation>');

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
    lines.push(`  <turn index="${idx}" role="${msg.role}">${escaped}</turn>`);
  }

  lines.push('</conversation>');

  if (latestUserIndex !== -1) {
    lines.push('');
    lines.push(
      `<latest_user_turn index="${latestUserIndex}">${escapeXml(
        latestUserContent
      )}</latest_user_turn>`
    );
  }

  return lines.join('\n');
}

function buildOnlyLatest(messages: Message[]): string {
  const lastUser = [...messages].reverse().find(m => m.role === 'user');

  const lines: string[] = [];
  lines.push(
    'The following XML contains the conversation to analyze. ' +
      'Only the latest user message is provided; focus on this turn.'
  );
  lines.push('');
  lines.push('<conversation>');

  if (lastUser) {
    const escaped = escapeXml(lastUser.content);
    lines.push(`  <turn index="1" role="user">${escaped}</turn>`);
  }

  lines.push('</conversation>');

  if (lastUser) {
    lines.push('');
    lines.push(
      `<latest_user_turn index="1">${escapeXml(lastUser.content)}</latest_user_turn>`
    );
  }

  return lines.join('\n');
}

function buildUserTail(messages: Message[], userTailCount: number): string {
  const userMessages = messages.filter(m => m.role === 'user');
  const tail = userMessages.slice(-userTailCount);

  const lines: string[] = [];
  lines.push(
    'The following XML contains the conversation to analyze. ' +
      `Only the last ${userTailCount} user messages are included, in order; ` +
      'assistant messages are omitted. Place extra emphasis on <latest_user_turn>.'
  );
  lines.push('');
  lines.push('<conversation>');

  let idx = 0;
  let latestUserIndex = -1;
  let latestUserContent = '';

  for (const msg of tail) {
    idx += 1;
    latestUserIndex = idx;
    latestUserContent = msg.content;

    const escaped = escapeXml(msg.content);
    lines.push(`  <turn index="${idx}" role="user">${escaped}</turn>`);
  }

  lines.push('</conversation>');

  if (latestUserIndex !== -1) {
    lines.push('');
    lines.push(
      `<latest_user_turn index="${latestUserIndex}">${escapeXml(
        latestUserContent
      )}</latest_user_turn>`
    );
  }

  return lines.join('\n');
}

function buildTruncatedAi(messages: Message[]): string {
  const lines: string[] = [];
  lines.push(
    'The following XML contains the conversation to analyze. ' +
      'All user turns are included; only the most recent assistant turn is retained.'
  );
  lines.push('');
  lines.push('<conversation>');

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
        `  <turn index="${idx}" role="user">${escapeXml(msg.content)}</turn>`
      );
    } else if (msg.role === 'assistant' && i === lastAssistantIndex) {
      idx += 1;
      lines.push(
        `  <turn index="${idx}" role="assistant">${escapeXml(msg.content)}</turn>`
      );
    }
  }

  lines.push('</conversation>');

  if (latestUserIndex !== -1) {
    lines.push('');
    lines.push(
      `<latest_user_turn index="${latestUserIndex}">${escapeXml(
        latestUserContent
      )}</latest_user_turn>`
    );
  }

  return lines.join('\n');
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}


