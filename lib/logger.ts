/**
 * Simple structured logger for the application
 * Can be extended with Winston, Pino, or similar in the future
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  timestamp: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatLog(entry: LogEntry): string {
    const { level, message, context, timestamp } = entry;
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level}: ${message}${contextStr}`;
  }

  debug(message: string, context?: Record<string, any>): void {
    if (this.isDevelopment) {
      const entry: LogEntry = {
        level: LogLevel.DEBUG,
        message,
        context,
        timestamp: new Date().toISOString(),
      };
      console.log(this.formatLog(entry));
    }
  }

  info(message: string, context?: Record<string, any>): void {
    const entry: LogEntry = {
      level: LogLevel.INFO,
      message,
      context,
      timestamp: new Date().toISOString(),
    };
    console.log(this.formatLog(entry));
  }

  warn(message: string, context?: Record<string, any>): void {
    const entry: LogEntry = {
      level: LogLevel.WARN,
      message,
      context,
      timestamp: new Date().toISOString(),
    };
    console.warn(this.formatLog(entry));
  }

  error(message: string, error?: Error | Record<string, any>): void {
    const context = error instanceof Error
      ? { error: error.message, stack: error.stack }
      : error;
    const entry: LogEntry = {
      level: LogLevel.ERROR,
      message,
      context,
      timestamp: new Date().toISOString(),
    };
    console.error(this.formatLog(entry));
  }
}

export const logger = new Logger();
