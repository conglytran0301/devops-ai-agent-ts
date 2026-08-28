/** Full port from logger.py (timestamps, colors, minimal mode) */
export interface Logger {
  info(message: string): void;
  warn(message: string, error?: Error): void;
  error(message: string, error?: Error): void;
  debug(message: string): void;
}

let _logger: Logger | null = null;

export function getLogger(): Logger {
  if (!_logger) {
    _logger = {
      info: (msg) => console.log(`[INFO] ${msg}`),
      warn: (msg, err) => console.warn(`[WARN] ${msg}`, err ?? ""),
      error: (msg, err) => console.error(`[ERROR] ${msg}`, err ?? ""),
      debug: (msg) => console.debug(`[DEBUG] ${msg}`),
    };
  }
  return _logger;
}