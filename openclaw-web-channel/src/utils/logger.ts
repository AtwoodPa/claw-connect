import type { Logger } from '../types.js';

export function createLogger(prefix: string): Logger {
  const format = (level: string, msg: string, meta?: Record<string, unknown>): string => {
    const ts = new Date().toISOString();
    const metaText = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${ts}] [${prefix}] [${level}] ${msg}${metaText}`;
  };

  return {
    child(name: string) {
      return createLogger(`${prefix}:${name}`);
    },
    info(msg: string, meta?: Record<string, unknown>) {
      console.log(format('INFO', msg, meta));
    },
    error(msg: string, meta?: Record<string, unknown>) {
      console.error(format('ERROR', msg, meta));
    },
    warn(msg: string, meta?: Record<string, unknown>) {
      console.warn(format('WARN', msg, meta));
    },
    debug(msg: string, meta?: Record<string, unknown>) {
      if (process.env.DEBUG) {
        console.debug(format('DEBUG', msg, meta));
      }
    },
  };
}
