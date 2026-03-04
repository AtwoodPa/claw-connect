import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ConnectionStatus =
  | 'connected'
  | 'reconnecting'
  | 'failed'
  | 'error'
  | 'disconnected';

export const useConnectionStore = defineStore('connection', () => {
  const gatewayUrl = ref('http://localhost:3010');
  const token = ref<string>('');
  const status = ref<ConnectionStatus>('disconnected');

  function setGatewayUrl(url: string) {
    gatewayUrl.value = url;
  }

  function setToken(t: string) {
    token.value = t;
  }

  function setStatus(s: ConnectionStatus, count?: number) {
    status.value = s;
  }

  return {
    gatewayUrl,
    token,
    status,
    setGatewayUrl,
    setToken,
    setStatus,
  };
});
