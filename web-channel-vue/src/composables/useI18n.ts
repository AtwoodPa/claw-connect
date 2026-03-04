import { messages } from '../locales/index.js';

function getNested(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === 'string' ? cur : undefined;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''));
}

export function useI18n() {
  const locale = navigator.language.startsWith('zh') ? 'zh-CN' : 'en';
  const msgs = messages[locale] ?? messages.en;

  return {
    t: (key: string, params?: Record<string, string | number>) => {
      const val = getNested(msgs as Record<string, unknown>, key);
      return interpolate(val ?? key, params);
    },
    locale: { value: locale },
  };
}

