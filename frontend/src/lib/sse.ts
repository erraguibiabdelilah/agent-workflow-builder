import { executionEventSchema, type ExecutionEvent } from '../../shared/src/events';

interface StreamOptions {
  signal?: AbortSignal;
  onError?: (error: Error) => void;
}

interface SseMessage {
  id?: string;
  event?: string;
  data: string[];
}

const API_BASE = '/api';

/** Stream an execution, reconnecting from the last received event sequence. */
export function streamExecution(
  executionId: string,
  onEvent: (event: ExecutionEvent) => void,
  options: StreamOptions = {},
): () => void {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener('abort', abortFromCaller, { once: true });
  if (options.signal?.aborted) abortFromCaller();

  void connectLoop(executionId, onEvent, options.onError, controller.signal);

  return () => {
    controller.abort();
    options.signal?.removeEventListener('abort', abortFromCaller);
  };
}

async function connectLoop(
  executionId: string,
  onEvent: (event: ExecutionEvent) => void,
  onError: StreamOptions['onError'],
  signal: AbortSignal,
) {
  let lastEventId = '';
  let retryDelayMs = 500;

  while (!signal.aborted) {
    try {
      const token = localStorage.getItem('auth_token');
      const headers = new Headers({ Accept: 'text/event-stream' });
      if (token) headers.set('Authorization', `Bearer ${token}`);
      if (lastEventId) headers.set('Last-Event-ID', lastEventId);

      const response = await fetch(`${API_BASE}/executions/${encodeURIComponent(executionId)}/stream`, {
        headers,
        signal,
        cache: 'no-store',
      });

      if (!response.ok) {
        const error = new Error(`Impossible de suivre l’exécution (${response.status})`);
        if (response.status === 401 || response.status === 404) {
          onError?.(error);
          return;
        }
        throw error;
      }
      if (!response.body) throw new Error('Le flux de l’exécution est indisponible');

      retryDelayMs = 500;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let message: SseMessage = { data: [] };
      let finished = false;

      const dispatch = () => {
        if (!message.data.length) {
          message = { data: [] };
          return;
        }
        try {
          const parsed: unknown = JSON.parse(message.data.join('\n'));
          const payload = parsed && typeof parsed === 'object'
            ? { ...(parsed as Record<string, unknown>), type: (parsed as Record<string, unknown>).type ?? message.event }
            : parsed;
          const event = executionEventSchema.parse(payload);
          onEvent(event);
          if (message.id) lastEventId = message.id;
          if (event.type === 'execution:finish') finished = true;
        } catch (error) {
          onError?.(error instanceof Error ? error : new Error('Événement d’exécution invalide'));
        }
        message = { data: [] };
      };

      while (!signal.aborted && !finished) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline = buffer.indexOf('\n');
        while (newline >= 0) {
          const line = buffer.slice(0, newline).replace(/\r$/, '');
          buffer = buffer.slice(newline + 1);
          if (line === '') {
            dispatch();
          } else if (!line.startsWith(':')) {
            const separator = line.indexOf(':');
            const field = separator < 0 ? line : line.slice(0, separator);
            const valueText = separator < 0 ? '' : line.slice(separator + 1).replace(/^ /, '');
            if (field === 'id') message.id = valueText;
            if (field === 'event') message.event = valueText;
            if (field === 'data') message.data.push(valueText);
          }
          newline = buffer.indexOf('\n');
        }
      }

      await reader.cancel().catch(() => undefined);
      if (finished || signal.aborted) return;
      // A server-side close without a finish event is recoverable. The next
      // connection asks for events after the last successfully delivered id.
    } catch (error) {
      if (signal.aborted) return;
      onError?.(error instanceof Error ? error : new Error('Connexion au flux interrompue'));
    }

    await pause(retryDelayMs, signal);
    retryDelayMs = Math.min(retryDelayMs * 2, 15000);
  }
}

function pause(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(done, milliseconds);
    signal.addEventListener('abort', done, { once: true });
    function done() {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      resolve();
    }
  });
}
