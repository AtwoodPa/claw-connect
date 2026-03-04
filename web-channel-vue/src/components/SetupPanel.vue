<template>
  <section class="oc-setup-shell">
    <div class="oc-setup-card">
      <div class="oc-setup-head">
        <p class="oc-setup-kicker">OpenClaw Web Channel</p>
        <h1>{{ t('setup.title') }}</h1>
        <p>{{ t('setup.description') }}</p>
      </div>

      <form class="oc-setup-form" @submit.prevent="handleConnect">
        <label class="oc-setup-field">
          <span>{{ t('setup.gatewayUrl') }}</span>
          <input
            v-model.trim="draft.gatewayUrl"
            type="url"
            required
            :placeholder="t('setup.gatewayUrlPlaceholder')"
          />
          <small>{{ t('setup.gatewayUrlHint') }}</small>
        </label>

        <label class="oc-setup-field">
          <span>{{ t('setup.apiKey') }}</span>
          <input v-model.trim="draft.apiKey" type="text" :placeholder="t('setup.apiKeyPlaceholder')" />
          <small>{{ t('setup.apiKeyHint') }}</small>
        </label>

        <label class="oc-setup-field">
          <span>{{ t('setup.token') }}</span>
          <input v-model.trim="draft.token" type="text" :placeholder="t('setup.tokenPlaceholder')" />
          <small>{{ t('setup.tokenHint') }}</small>
        </label>

        <div class="oc-setup-actions">
          <button type="button" class="ghost" :disabled="loadingToken" @click="fetchToken">
            {{ loadingToken ? t('setup.fetching') : t('setup.fetchToken') }}
          </button>
          <button type="submit" class="primary" :disabled="connecting">
            {{ connecting ? t('setup.connecting') : t('setup.connect') }}
          </button>
        </div>

        <p v-if="errorMessage" class="oc-setup-error">{{ errorMessage }}</p>
      </form>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import type { SetupConfig } from '../types/index.js';

const props = defineProps<{
  initial: SetupConfig;
  t: (key: string, params?: Record<string, string | number>) => string;
}>();

const emit = defineEmits<{
  save: [SetupConfig];
}>();

const draft = reactive<SetupConfig>({
  gatewayUrl: props.initial.gatewayUrl,
  apiKey: props.initial.apiKey,
  token: props.initial.token,
});

const loadingToken = ref(false);
const connecting = ref(false);
const errorMessage = ref('');

async function fetchToken() {
  errorMessage.value = '';
  loadingToken.value = true;
  try {
    const endpoint = `${draft.gatewayUrl.replace(/\/$/, '')}/auth`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ apiKey: draft.apiKey || undefined }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || response.statusText);
    }

    const payload = (await response.json()) as { token?: string };
    if (!payload.token) {
      throw new Error('token not found in response');
    }
    draft.token = payload.token;
  } catch (error) {
    errorMessage.value = props.t('setup.fetchTokenError', {
      msg: error instanceof Error ? error.message : String(error),
    });
  } finally {
    loadingToken.value = false;
  }
}

function handleConnect() {
  errorMessage.value = '';
  connecting.value = true;
  try {
    emit('save', {
      gatewayUrl: draft.gatewayUrl,
      apiKey: draft.apiKey,
      token: draft.token,
    });
  } finally {
    connecting.value = false;
  }
}
</script>

<style scoped>
.oc-setup-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 28px;
}

.oc-setup-card {
  width: min(760px, 100%);
  border: 1px solid var(--border-color);
  border-radius: 22px;
  background: var(--surface-glass);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(12px);
  overflow: hidden;
}

.oc-setup-head {
  padding: 28px 28px 20px;
  background: linear-gradient(
    120deg,
    rgba(15, 118, 110, 0.14),
    rgba(249, 115, 22, 0.09) 62%,
    transparent
  );
}

.oc-setup-kicker {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--primary-color);
  font-weight: 700;
}

.oc-setup-head h1 {
  margin: 10px 0 8px;
  font-size: clamp(24px, 4vw, 34px);
}

.oc-setup-head p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.6;
}

.oc-setup-form {
  padding: 24px 28px 30px;
  display: grid;
  gap: 16px;
}

.oc-setup-field {
  display: grid;
  gap: 6px;
}

.oc-setup-field > span {
  font-weight: 600;
  font-size: 14px;
}

.oc-setup-field input {
  width: 100%;
  height: 44px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--bg-primary) 88%, transparent);
  color: var(--text-primary);
  padding: 0 14px;
  font-size: 14px;
  font-family: var(--font-ui);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.oc-setup-field input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary-color) 20%, transparent);
}

.oc-setup-field small {
  font-size: 12px;
  color: var(--text-secondary);
}

.oc-setup-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
}

.oc-setup-actions button {
  height: 40px;
  border-radius: 999px;
  border: 1px solid transparent;
  padding: 0 18px;
  cursor: pointer;
  font-weight: 600;
  font-family: var(--font-ui);
}

.oc-setup-actions button.ghost {
  border-color: var(--border-color);
  background: transparent;
  color: var(--text-primary);
}

.oc-setup-actions button.primary {
  background: var(--primary-color);
  color: #fff;
}

.oc-setup-actions button.primary:hover {
  background: var(--primary-hover);
}

.oc-setup-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.oc-setup-error {
  margin: 2px 0 0;
  color: #dc2626;
  font-size: 13px;
}

@media (max-width: 680px) {
  .oc-setup-shell {
    padding: 16px;
  }

  .oc-setup-head,
  .oc-setup-form {
    padding-left: 18px;
    padding-right: 18px;
  }

  .oc-setup-actions {
    flex-direction: column;
  }

  .oc-setup-actions button {
    width: 100%;
  }
}
</style>
