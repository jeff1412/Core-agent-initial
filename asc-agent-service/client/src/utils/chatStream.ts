export interface StreamActivity {
  kind: 'step' | 'commit' | 'file' | 'status';
  message: string;
  path?: string;
  status?: 'checking' | 'present' | 'missing';
}

export interface ChatStreamHandlers {
  onActivity?: (item: StreamActivity) => void;
  onThinking?: (delta: string, full: string) => void;
  onText?: (delta: string, full: string) => void;
  onDone?: (payload: { model?: string }) => void;
  onError?: (message: string) => void;
}

function parseSseBlock(block: string): { event: string; data: string } | null {
  let event = 'message';
  let data = '';
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    if (line.startsWith('data:')) data += line.slice(5).trim();
  }
  if (!data) return null;
  return { event, data };
}

export async function consumeChatStream(
  response: Response,
  handlers: ChatStreamHandlers
): Promise<string> {
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const json = await response.json();
      message = json.error || message;
    } catch {
      /* SSE error body */
    }
    handlers.onError?.(message);
    throw new Error(message);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Streaming not supported');

  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let fullThinking = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() || '';

    for (const block of blocks) {
      const parsed = parseSseBlock(block.trim());
      if (!parsed) continue;

      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(parsed.data);
      } catch {
        continue;
      }

      if (parsed.event === 'activity') {
        handlers.onActivity?.(payload as StreamActivity);
      } else if (parsed.event === 'thinking') {
        const delta = String(payload.delta || '');
        fullThinking += delta;
        handlers.onThinking?.(delta, fullThinking);
      } else if (parsed.event === 'text') {
        const delta = String(payload.delta || '');
        fullText += delta;
        handlers.onText?.(delta, fullText);
      } else if (parsed.event === 'done') {
        handlers.onDone?.(payload as { model?: string });
      } else if (parsed.event === 'error') {
        const message = String(payload.message || 'Stream error');
        handlers.onError?.(message);
        throw new Error(message);
      }
    }
  }

  return fullText;
}
