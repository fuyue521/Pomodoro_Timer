const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

function timestamp() {
  return new Date().toISOString().slice(11, 23);
}

function format(level, module, msg, data) {
  const base = `[${timestamp()}] [${level.padEnd(5)}] [${module}] ${msg}`;
  if (data !== undefined) {
    const extra = typeof data === 'object' ? JSON.stringify(data) : data;
    return `${base}  ${extra}`;
  }
  return base;
}

export function createLogger(module) {
  function log(level, method, msg, data) {
    const text = format(level, module, msg, data);
    console[method](text);
  }

  return {
    debug(msg, data) { log('DEBUG', 'debug', msg, data); },
    info(msg, data)  { log('INFO', 'log', msg, data); },
    warn(msg, data)  { log('WARN', 'warn', msg, data); },
    error(msg, data) { log('ERROR', 'error', msg, data); },
  };
}
