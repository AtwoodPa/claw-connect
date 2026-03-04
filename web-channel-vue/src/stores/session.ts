import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { generateId, toSessionKey } from '../utils/format.js';
import type { Session } from '../types/index.js';

export const useSessionStore = defineStore('session', () => {
  const sessions = ref<Session[]>([]);
  const currentId = ref<string>('');

  const currentSession = computed(() =>
    sessions.value.find((s) => s.id === currentId.value),
  );

  const sortedSessions = computed(() =>
    [...sessions.value].sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return b.updatedAt - a.updatedAt;
    }),
  );

  function createSession(title?: string) {
    const id = generateId();
    const session: Session = {
      id,
      sessionKey: toSessionKey(id),
      title: title || `New Chat ${sessions.value.length + 1}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0,
    };
    sessions.value.unshift(session);
    currentId.value = session.id;
    return session;
  }

  function selectSession(id: string) {
    currentId.value = id;
  }

  function deleteSession(id: string) {
    const idx = sessions.value.findIndex((s) => s.id === id);
    if (idx !== -1) {
      sessions.value.splice(idx, 1);
      if (currentId.value === id) {
        currentId.value = sessions.value[0]?.id || '';
      }
    }
  }

  function resetSession(id: string) {
    const s = sessions.value.find((x) => x.id === id);
    if (s) {
      s.messageCount = 0;
      s.updatedAt = Date.now();
    }
  }

  function updateTitle(id: string, title: string) {
    const s = sessions.value.find((x) => x.id === id);
    if (s) {
      s.title = title;
      s.updatedAt = Date.now();
    }
  }

  function pinSession(id: string, pinned: boolean) {
    const s = sessions.value.find((x) => x.id === id);
    if (s) {
      s.isPinned = pinned;
      s.updatedAt = Date.now();
    }
  }

  function ensureSession(id: string) {
    const existing = sessions.value.find((s) => s.id === id);
    if (existing) {
      return existing;
    }
    const created: Session = {
      id,
      sessionKey: toSessionKey(id),
      title: `Chat ${sessions.value.length + 1}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0,
    };
    sessions.value.unshift(created);
    return created;
  }

  return {
    sessions,
    currentId,
    currentSession,
    sortedSessions,
    createSession,
    ensureSession,
    selectSession,
    deleteSession,
    resetSession,
    updateTitle,
    pinSession,
  };
});
