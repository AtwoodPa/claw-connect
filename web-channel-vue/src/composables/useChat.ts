import { ref, computed, watch } from 'vue';
import { useChatStore } from '../stores/chat.js';
import { useSessionStore } from '../stores/session.js';
import { useWebSocket } from './useWebSocket.js';
import { useMessageQueue } from '../utils/queue.js';
import { generateId, sessionIdFromSessionKey } from '../utils/format.js';
import type { Message } from '../types/index.js';

type ChatMessageFrame = {
  type: 'message';
  id?: string;
  content?: string;
  role?: string;
  done?: boolean;
  sessionKey?: string;
};

type HistoryFrame = {
  type: 'history';
  sessionKey?: string;
  messages?: unknown[];
};

type ErrorFrame = {
  type: 'error' | 'auth_failed';
  error?: string;
  sessionKey?: string;
};

function normalizeHistoryMessage(input: unknown): Message | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const obj = input as {
    id?: unknown;
    role?: unknown;
    timestamp?: unknown;
    content?: unknown;
    text?: unknown;
  };

  const role = typeof obj.role === 'string' ? obj.role : 'assistant';
  const timestamp = typeof obj.timestamp === 'number' ? obj.timestamp : Date.now();

  let content = '';
  if (typeof obj.text === 'string') {
    content = obj.text;
  } else if (typeof obj.content === 'string') {
    content = obj.content;
  } else if (Array.isArray(obj.content)) {
    const blocks = obj.content as Array<{ type?: unknown; text?: unknown }>;
    content = blocks
      .filter((b) => b?.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text as string)
      .join('\n');
  }

  if (!content.trim()) {
    return null;
  }

  return {
    id: typeof obj.id === 'string' ? obj.id : generateId(),
    role: role as Message['role'],
    content,
    timestamp,
  };
}

export function useChat() {
  const chatStore = useChatStore();
  const sessionStore = useSessionStore();
  const { isConnected, sendMessage, reconnect, setOnMessage } = useWebSocket();
  const { queue, addToQueue, getNext } = useMessageQueue();

  const isStreaming = ref(false);
  const currentStreamId = ref<string | null>(null);

  function getSessionIdByKey(sessionKey?: string): string {
    const fromKey = sessionIdFromSessionKey(sessionKey);
    if (fromKey) {
      sessionStore.ensureSession(fromKey);
      return fromKey;
    }
    return sessionStore.currentId;
  }

  function requestHistoryForSession(sessionId: string) {
    const session = sessionStore.ensureSession(sessionId);
    sendMessage({
      type: 'history',
      payload: {
        sessionId: session.id,
        sessionKey: session.sessionKey,
        limit: 200,
      },
    });
  }

  watch(
    () => sessionStore.currentId,
    (id) => {
      if (!id) {
        return;
      }
      chatStore.setSessionId(id);
      requestHistoryForSession(id);
    },
    { immediate: true },
  );

  setOnMessage((data) => {
    const type = data.type as string;

    if (type === 'message') {
      const payload = data as ChatMessageFrame;
      const sessionId = getSessionIdByKey(payload.sessionKey);
      const msgId = payload.id ?? currentStreamId.value ?? generateId();
      const chunk = payload.content ?? '';

      let msg = chatStore.getMessage(msgId, sessionId);
      if (!msg && chunk) {
        msg = {
          id: msgId,
          role: 'assistant',
          content: chunk,
          timestamp: Date.now(),
          sessionKey: payload.sessionKey,
        };
        chatStore.addMessage(msg, sessionId);
      } else if (chunk) {
        chatStore.updateMessage(
          msgId,
          {
            content: `${msg.content}${chunk}`,
            timestamp: Date.now(),
          },
          sessionId,
        );
      }

      if (!msg && payload.done && !chunk) {
        chatStore.addMessage(
          {
            id: generateId(),
            role: 'system',
            content: 'Agent returned empty visible output. Please check gateway logs.',
            timestamp: Date.now(),
          },
          sessionId,
        );
      }

      if (payload.done) {
        if (!currentStreamId.value || currentStreamId.value === msgId) {
          isStreaming.value = false;
          currentStreamId.value = null;
          const next = getNext();
          if (next) {
            doSend(next.content, next.images);
          }
        }
      }
      return;
    }

    if (type === 'history') {
      const payload = data as HistoryFrame;
      const sessionId = getSessionIdByKey(payload.sessionKey);
      const history = Array.isArray(payload.messages)
        ? payload.messages
            .map((item) => normalizeHistoryMessage(item))
            .filter((item): item is Message => Boolean(item))
        : [];
      chatStore.loadHistory(sessionId, history);
      return;
    }

    if (type === 'message_error') {
      const errorText = typeof data.error === 'string' ? data.error : 'Unknown error';
      const sessionId = getSessionIdByKey(typeof data.sessionKey === 'string' ? data.sessionKey : undefined);
      chatStore.addMessage(
        {
          id: generateId(),
          role: 'system',
          content: errorText,
          timestamp: Date.now(),
        },
        sessionId,
      );
      isStreaming.value = false;
      currentStreamId.value = null;
      return;
    }

    if (type === 'error' || type === 'auth_failed') {
      const payload = data as ErrorFrame;
      const errorText = typeof payload.error === 'string' ? payload.error : 'Request failed';
      const sessionId = getSessionIdByKey(payload.sessionKey);
      chatStore.addMessage(
        {
          id: generateId(),
          role: 'system',
          content: errorText,
          timestamp: Date.now(),
        },
        sessionId,
      );
      isStreaming.value = false;
      currentStreamId.value = null;
    }
  });

  function doSend(content: string, images?: File[]) {
    const current = sessionStore.currentSession;
    if (!current) {
      return;
    }

    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
      sessionKey: current.sessionKey,
    };
    chatStore.addMessage(userMsg, current.id);

    const runId = generateId();
    currentStreamId.value = runId;
    isStreaming.value = true;

    sendMessage({
      type: 'chat',
      payload: {
        content,
        sessionId: current.id,
        sessionKey: current.sessionKey,
        messageId: runId,
      },
    });
  }

  function send(content: string, images?: File[]) {
    if (isStreaming.value) {
      addToQueue({ content, images });
      return;
    }
    doSend(content, images);
  }

  function stop() {
    const current = sessionStore.currentSession;
    if (!current) {
      return;
    }
    sendMessage({
      type: 'stop',
      payload: {
        sessionId: current.id,
        sessionKey: current.sessionKey,
        runId: currentStreamId.value ?? undefined,
      },
    });
    isStreaming.value = false;
    currentStreamId.value = null;
  }

  return {
    messages: computed(() => chatStore.currentMessages),
    isStreaming,
    isConnected,
    send,
    stop,
    reconnect,
    queue,
    currentStreamId,
  };
}
