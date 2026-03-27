type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerContext {
  requestId?: string;
  scope?: string;
  userId?: string;
}

export class Logger {
  constructor(private readonly context: LoggerContext = {}) {}

  child(context: LoggerContext): Logger {
    return new Logger({ ...this.context, ...context });
  }

  debug(message: string, meta?: Record<string, unknown>) {
    this.write('debug', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.write('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.write('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>) {
    this.write('error', message, meta);
  }

  private write(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    console[level === 'debug' ? 'log' : level](
      JSON.stringify({
        level,
        message,
        timestamp: new Date().toISOString(),
        ...this.context,
        ...meta,
      }),
    );
  }
}
