import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Message } from '../types/index.js';

function getSessionMessages(map: Map<string, Message[]>, sessionId: string): Message[] {
  return map.get(sessionId) ?? [];
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<Map<string, Message[]>>(new Map());
  const currentSessionId = ref<string>('');

  const currentMessages = computed(() =>
    getSessionMessages(messages.value, currentSessionId.value),
  );

  function setSessionId(id: string) {
    currentSessionId.value = id;
    if (!messages.value.has(id)) {
      messages.value.set(id, []);
    }
  }

  function addMessage(message: Message, sessionId = currentSessionId.value) {
    const list = getSessionMessages(messages.value, sessionId);
    list.push(message);
    messages.value.set(sessionId, list);
  }

  function updateMessage(
    id: string,
    updates: Partial<Message>,
    sessionId = currentSessionId.value,
  ) {
    const list = getSessionMessages(messages.value, sessionId);
    const idx = list.findIndex((m) => m.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
    }
  }

  function getMessage(id: string, sessionId = currentSessionId.value): Message | undefined {
    return getSessionMessages(messages.value, sessionId).find((m) => m.id === id);
  }

  function deleteMessage(id: string, sessionId = currentSessionId.value) {
    const list = getSessionMessages(messages.value, sessionId);
    const idx = list.findIndex((m) => m.id === id);
    if (idx !== -1) {
      list.splice(idx, 1);
    }
  }

  function clearMessages(sessionId = currentSessionId.value) {
    messages.value.set(sessionId, []);
  }

  function loadHistory(sessionId: string, history: Message[]) {
    messages.value.set(sessionId, history);
  }

  return {
    messages,
    currentSessionId,
    currentMessages,
    setSessionId,
    addMessage,
    updateMessage,
    getMessage,
    deleteMessage,
    clearMessages,
    loadHistory,
  };
});
