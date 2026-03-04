import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useConnectionStore } from '../stores/connection.js';

const MAX_RECONNECT = 5;
const RECONNECT_DELAY = 3000;

export function useWebSocket() {
  const ws = ref<WebSocket | null>(null);
  const isConnected = ref(false);
  const reconnectCount = ref(0);
  const store = useConnectionStore();

  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let manualClose = false;

  function connect() {
    manualClose = false;
    const url = store.gatewayUrl.replace(/^http/, 'ws') + '/ws';
    ws.value = new WebSocket(url);

    ws.value.onopen = () => {
      isConnected.value = true;
      reconnectCount.value = 0;
      store.setStatus('connected');
      if (store.token) {
        ws.value?.send(
          JSON.stringify({ type: 'auth', payload: { token: store.token } })
        );
      }
      attachMessageHandler();
      heartbeatTimer = setInterval(() => {
        ws.value?.send(JSON.stringify({ type: 'ping' }));
      }, 30000);
    };

    ws.value.onclose = () => {
      isConnected.value = false;
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      if (!manualClose && reconnectCount.value < MAX_RECONNECT) {
        reconnectCount.value++;
        store.setStatus('reconnecting');
        reconnectTimer = setTimeout(
          connect,
          RECONNECT_DELAY * reconnectCount.value
        );
      } else {
        store.setStatus('failed');
      }
    };

    ws.value.onerror = () => {
      store.setStatus('error');
    };
  }

  function reconnect() {
    manualClose = true;
    ws.value?.close();
    reconnectCount.value = 0;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    connect();
  }

  function sendMessage(data: Record<string, unknown>) {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(data));
    }
  }

  let messageHandler: ((data: Record<string, unknown>) => void) | null = null;

  function setOnMessage(handler: (data: Record<string, unknown>) => void) {
    messageHandler = handler;
    if (ws.value) {
      ws.value.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data as string) as Record<string, unknown>;
          handler(d);
        } catch {}
      };
    }
  }

  function attachMessageHandler() {
    if (ws.value && messageHandler) {
      ws.value.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data as string) as Record<string, unknown>;
          messageHandler?.(d);
        } catch {}
      };
    }
  }

  onMounted(() => connect());

  watch(
    () => store.gatewayUrl,
    () => {
      if (!ws.value) {
        return;
      }
      reconnect();
    },
  );

  watch(
    () => store.token,
    (token) => {
      if (ws.value?.readyState === WebSocket.OPEN && token) {
        sendMessage({ type: 'auth', payload: { token } });
      }
    },
  );

  onUnmounted(() => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    manualClose = true;
    ws.value?.close();
  });

  return {
    ws,
    isConnected,
    reconnect,
    sendMessage,
    setOnMessage,
  };
}
