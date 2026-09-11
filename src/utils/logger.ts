/**
 * Logging utilities for AI-Driven DevOps.
 * Provides consistent logging with severity levels and formatting.
 */

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  OK = "OK",
  WARN = "WARN",
  ERROR = "ERROR",
  CRITICAL = "CRITICAL",
  BLOCK = "BLOCK",

  AI = "AI",
  K8S = "K8S",
  PROM = "PROM",
  CONFIG = "CONFIG",
  NOTIFY = "NOTIFY",
  ANALYSIS = "ANALYSIS",
  DECISION = "DECISION",
}

export interface LoggerOptions {
  enableTimestamps?: boolean;
  enableColors?: boolean;
  minimal?: boolean;
}

type LogMetadata = Record<string, unknown>;

const ANSI_RESET = "\x1b[0m";

const COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: "\x1b[2m",
  [LogLevel.INFO]: "\x1b[0m",
  [LogLevel.OK]: "\x1b[32m",
  [LogLevel.WARN]: "\x1b[33m",
  [LogLevel.ERROR]: "\x1b[31m",
  [LogLevel.CRITICAL]: "\x1b[31;1m",
  [LogLevel.BLOCK]: "\x1b[31;1m",
  [LogLevel.AI]: "\x1b[35m",
  [LogLevel.K8S]: "\x1b[36m",
  [LogLevel.PROM]: "\x1b[34m",
  [LogLevel.CONFIG]: "\x1b[0m",
  [LogLevel.NOTIFY]: "\x1b[33m",
  [LogLevel.ANALYSIS]: "\x1b[36m",
  [LogLevel.DECISION]: "\x1b[35m",
};

const STANDARD_SYMBOLS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: "·",
  [LogLevel.INFO]: "i",
  [LogLevel.OK]: "✓",
  [LogLevel.WARN]: "!",
  [LogLevel.ERROR]: "✗",
  [LogLevel.CRITICAL]: "!!",
  [LogLevel.BLOCK]: "X",
  [LogLevel.AI]: ">",
  [LogLevel.K8S]: ">",
  [LogLevel.PROM]: ">",
  [LogLevel.CONFIG]: ">",
  [LogLevel.NOTIFY]: ">",
  [LogLevel.ANALYSIS]: ">",
  [LogLevel.DECISION]: ">",
};

const MINIMAL_SYMBOLS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: ".",
  [LogLevel.INFO]: "i",
  [LogLevel.OK]: "+",
  [LogLevel.WARN]: "!",
  [LogLevel.ERROR]: "x",
  [LogLevel.CRITICAL]: "X",
  [LogLevel.BLOCK]: "#",
  [LogLevel.AI]: ">",
  [LogLevel.K8S]: ">",
  [LogLevel.PROM]: ">",
  [LogLevel.CONFIG]: ">",
  [LogLevel.NOTIFY]: ">",
  [LogLevel.ANALYSIS]: ">",
  [LogLevel.DECISION]: ">",
};

/**
 * Simple logger with consistent formatting, optional ANSI colors,
 * timestamps, and component-specific log methods.
 */
export class Logger {
  private readonly enableTimestamps: boolean;
  private readonly enableColors: boolean;
  private readonly minimal: boolean;
  private readonly symbols: Record<LogLevel, string>;

  public constructor(options: LoggerOptions = {}) {
    this.enableTimestamps = options.enableTimestamps ?? false;
    this.minimal = options.minimal ?? false;
    this.enableColors = options.enableColors ?? this.detectColorSupport();
    this.symbols = this.minimal ? MINIMAL_SYMBOLS : STANDARD_SYMBOLS;
  }

  private detectColorSupport(): boolean {
    if (process.env.CI || process.env.GITHUB_ACTIONS) {
      return false;
    }

    if (!process.stdout.isTTY) {
      return false;
    }

    const term = process.env.TERM ?? "";
    return (
      term.includes("color") ||
      ["xterm", "xterm-256color", "screen", "screen-256color"].includes(term)
    );
  }

  private formatTimestamp(): string {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    metadata: LogMetadata = {}
  ): string {
    const parts: string[] = [];

    if (this.enableTimestamps) {
      parts.push(`[${this.formatTimestamp()}]`);
    }

    const symbol = this.symbols[level] ?? "";
    const levelText = `[${level.padEnd(8, " ")}] ${symbol.padEnd(2, " ")}`;

    if (this.enableColors) {
      parts.push(`${COLORS[level]}${levelText}${ANSI_RESET}`);
    } else {
      parts.push(levelText);
    }

    parts.push(message);

    if (Object.keys(metadata).length > 0) {
      const extras = Object.entries(metadata)
        .map(([key, value]) => `${key}=${String(value)}`)
        .join(" ");

      if (this.enableColors) {
        parts.push(`${COLORS[LogLevel.DEBUG]}${extras}${ANSI_RESET}`);
      } else {
        parts.push(`(${extras})`);
      }
    }

    return parts.join(" ");
  }

  private log(
    level: LogLevel,
    message: string,
    metadata: LogMetadata = {}
  ): void {
    process.stdout.write(`${this.formatMessage(level, message, metadata)}\n`);
  }

  /** Log a debug message. */
  public debug(message: string, metadata: LogMetadata = {}): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  /** Log an informational message. */
  public info(message: string, metadata: LogMetadata = {}): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  /** Log a successful operation. */
  public ok(message: string, metadata: LogMetadata = {}): void {
    this.log(LogLevel.OK, message, metadata);
  }

  /** Log a warning. */
  public warn(message: string, error?: Error, metadata: LogMetadata = {}): void {
    const errorMetadata = error ? { ...metadata, error: error.message } : metadata;
    this.log(LogLevel.WARN, message, errorMetadata);
  }

  /** Log an error. */
  public error(message: string, error?: Error, metadata: LogMetadata = {}): void {
    const errorMetadata = error ? { ...metadata, error: error.message } : metadata;
    this.log(LogLevel.ERROR, message, errorMetadata);
  }

  /** Log a critical condition. */
  public critical(message: string, metadata: LogMetadata = {}): void {
    this.log(LogLevel.CRITICAL, message, metadata);
  }

  /** Log a deployment-blocking decision. */
  public block(message: string, metadata: LogMetadata = {}): void {
    this.log(LogLevel.BLOCK, message, metadata);
  }

  /** Log an AI-related operation. */
  public ai(message: string, metadata: LogMetadata = {}): void {
    this.log(LogLevel.AI, message, metadata);
  }

  /** Log a Kubernetes-related operation. */
  public k8s(message: string, metadata: LogMetadata = {}): void {
    this.log(LogLevel.K8S, message, metadata);
  }

  /** Log a Prometheus-related operation. */
  public prom(message: string, metadata: LogMetadata = {}): void {
    this.log(LogLevel.PROM, message, metadata);
  }

  /** Log configuration information. */
  public config(message: string, metadata: LogMetadata = {}): void {
    this.log(LogLevel.CONFIG, message, metadata);
  }

  /** Log a notification-related operation. */
  public notify(message: string, metadata: LogMetadata = {}): void {
    this.log(LogLevel.NOTIFY, message, metadata);
  }

  /** Log an analysis-related operation. */
  public analysis(message: string, metadata: LogMetadata = {}): void {
    this.log(LogLevel.ANALYSIS, message, metadata);
  }

  /** Log a deployment or operational decision. */
  public decision(message: string, metadata: LogMetadata = {}): void {
    this.log(LogLevel.DECISION, message, metadata);
  }

  /** Print a separator line. */
  public separator(char = "-", length = 80): void {
    process.stdout.write(`${char.repeat(length)}\n`);
  }

  /** Print a section header. */
  public section(title: string): void {
    this.separator("=");
    process.stdout.write(`  ${title}\n`);
    this.separator("=");
  }

  /** Print a subsection header. */
  public subsection(title: string): void {
    process.stdout.write(`\n▸ ${title}\n`);
  }

  /** Print an indented list item. */
  public listItem(message: string, level = "info"): void {
    const prefix = level === "info" ? "  •" : `  [${level.toUpperCase()}]`;
    process.stdout.write(`${prefix} ${message}\n`);
  }

  /** Print the beginning of a log group. */
  public groupStart(title: string): void {
    process.stdout.write(`\n┌─ ${title}\n`);
  }

  /** Print the end of a log group. */
  public groupEnd(): void {
    process.stdout.write("└─\n");
  }

  /** Print a simple terminal progress bar. */
  public progress(message: string, current: number, total: number): void {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    const barLength = 20;
    const filled = total > 0 ? Math.floor((barLength * current) / total) : 0;
    const bar = `${"█".repeat(filled)}${"░".repeat(barLength - filled)}`;

    process.stdout.write(
      `  [${bar}] ${percentage.toFixed(1).padStart(5, " ")}% ${message}\r`
    );

    if (current >= total) {
      process.stdout.write("\n");
    }
  }
}

let loggerInstance: Logger | null = null;

/**
 * Get or create the global logger instance.
 *
 * Like the Python implementation, options only apply on the first call:
 * later calls return the same singleton instance.
 */
export function getLogger(options: LoggerOptions = {}): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger(options);
  }

  return loggerInstance;
}

/** Convenience function for quick informational logging. */
export function info(message: string, metadata: LogMetadata = {}): void {
  getLogger().info(message, metadata);
}

/** Convenience function for quick success logging. */
export function ok(message: string, metadata: LogMetadata = {}): void {
  getLogger().ok(message, metadata);
}

/** Convenience function for quick warning logging. */
export function warn(message: string, error?: Error, metadata: LogMetadata = {}): void {
  getLogger().warn(message, error, metadata);
}

/** Convenience function for quick error logging. */
export function error(message: string, exception?: Error, metadata: LogMetadata = {}): void {
  getLogger().error(message, exception, metadata);
}

/** Convenience function for quick critical logging. */
export function critical(message: string, metadata: LogMetadata = {}): void {
  getLogger().critical(message, metadata);
}

/** Convenience function for quick deployment-block logging. */
export function block(message: string, metadata: LogMetadata = {}): void {
  getLogger().block(message, metadata);
}