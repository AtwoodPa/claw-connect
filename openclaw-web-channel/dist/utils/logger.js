export function createLogger(prefix) {
    const format = (level, msg, meta) => {
        const ts = new Date().toISOString();
        const metaText = meta ? ` ${JSON.stringify(meta)}` : '';
        return `[${ts}] [${prefix}] [${level}] ${msg}${metaText}`;
    };
    return {
        child(name) {
            return createLogger(`${prefix}:${name}`);
        },
        info(msg, meta) {
            console.log(format('INFO', msg, meta));
        },
        error(msg, meta) {
            console.error(format('ERROR', msg, meta));
        },
        warn(msg, meta) {
            console.warn(format('WARN', msg, meta));
        },
        debug(msg, meta) {
            if (process.env.DEBUG) {
                console.debug(format('DEBUG', msg, meta));
            }
        },
    };
}
//# sourceMappingURL=logger.js.map