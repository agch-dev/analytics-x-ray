/**
 * Centralized Logging Utility
 * 
 * Provides consistent, colorized logging across all extension contexts
 * with different log levels and optional context tagging.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogContext = 'background' | 'panel' | 'popup' | 'content' | 'devtools' | 'storage' | 'ui';

interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  enabledContexts: LogContext[] | 'all';
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CONTEXT_COLORS: Record<LogContext, string> = {
  background: '#ff6b6b',
  panel: '#4ecdc4',
  popup: '#45b7d1',
  content: '#96ceb4',
  devtools: '#dfe6e9',
  storage: '#fdcb6e',
  ui: '#a29bfe',
};

class Logger {
  private config: LoggerConfig = {
    enabled: true,
    minLevel: 'debug',
    enabledContexts: 'all',
  };

  private prefix = '[analytics-x-ray]';

  /**
   * Configure the logger
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if a log should be output
   */
  private shouldLog(level: LogLevel, context?: LogContext): boolean {
    if (!this.config.enabled) return false;
    
    // Check log level
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.minLevel]) {
      return false;
    }

    // Check context filter
    if (context && this.config.enabledContexts !== 'all') {
      return this.config.enabledContexts.includes(context);
    }

    return true;
  }

  /**
   * Format the log message with context
   */
  private formatMessage(context?: LogContext): string {
    if (!context) return this.prefix;
    return `${this.prefix} [${context}]`;
  }

  /**
   * Get console style for context
   */
  private getContextStyle(context?: LogContext): string {
    if (!context) return 'color: #fff; font-weight: bold';
    const color = CONTEXT_COLORS[context];
    return `color: ${color}; font-weight: bold`;
  }

  /**
   * Debug level logging - detailed information for debugging
   */
  debug(message: string, context?: LogContext, ...args: unknown[]): void {
    if (!this.shouldLog('debug', context)) return;
    console.log(
      `%c${this.formatMessage(context)}%c ${message}`,
      this.getContextStyle(context),
      'color: inherit',
      ...args
    );
  }

  /**
   * Info level logging - general information
   */
  info(message: string, context?: LogContext, ...args: unknown[]): void {
    if (!this.shouldLog('info', context)) return;
    console.info(
      `%c${this.formatMessage(context)}%c ${message}`,
      this.getContextStyle(context),
      'color: inherit',
      ...args
    );
  }

  /**
   * Warning level logging - potential issues
   */
  warn(message: string, context?: LogContext, ...args: unknown[]): void {
    if (!this.shouldLog('warn', context)) return;
    console.warn(
      `%c${this.formatMessage(context)}%c ${message}`,
      this.getContextStyle(context),
      'color: inherit',
      ...args
    );
  }

  /**
   * Error level logging - errors and exceptions
   */
  error(message: string, context?: LogContext, ...args: unknown[]): void {
    if (!this.shouldLog('error', context)) return;
    console.error(
      `%c${this.formatMessage(context)}%c ${message}`,
      this.getContextStyle(context),
      'color: inherit',
      ...args
    );
  }

  /**
   * Log a group of related messages
   */
  group(title: string, context?: LogContext, collapsed: boolean = false): void {
    if (!this.shouldLog('debug', context)) return;
    const method = collapsed ? console.groupCollapsed : console.group;
    method(`%c${this.formatMessage(context)}%c ${title}`, this.getContextStyle(context), 'color: inherit');
  }

  groupEnd(): void {
    console.groupEnd();
  }

  /**
   * Log with timing information
   */
  time(label: string, context?: LogContext): void {
    if (!this.shouldLog('debug', context)) return;
    console.time(`${this.formatMessage(context)} ${label}`);
  }

  timeEnd(label: string, context?: LogContext): void {
    if (!this.shouldLog('debug', context)) return;
    console.timeEnd(`${this.formatMessage(context)} ${label}`);
  }

  /**
   * Log table data
   */
  table(data: unknown, context?: LogContext): void {
    if (!this.shouldLog('debug', context)) return;
    console.log(`%c${this.formatMessage(context)}`, this.getContextStyle(context));
    console.table(data);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience methods with context bound
export const createContextLogger = (context: LogContext) => ({
  debug: (message: string, ...args: unknown[]) => logger.debug(message, context, ...args),
  info: (message: string, ...args: unknown[]) => logger.info(message, context, ...args),
  warn: (message: string, ...args: unknown[]) => logger.warn(message, context, ...args),
  error: (message: string, ...args: unknown[]) => logger.error(message, context, ...args),
  group: (title: string, collapsed?: boolean) => logger.group(title, context, collapsed),
  groupEnd: () => logger.groupEnd(),
  time: (label: string) => logger.time(label, context),
  timeEnd: (label: string) => logger.timeEnd(label, context),
  table: (data: unknown) => logger.table(data, context),
});

