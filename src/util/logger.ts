import { Platform } from 'react-native';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export type KnownLogTag =
  | 'AUTH'
  | 'SYNC'
  | 'DB'
  | 'NOTIF'
  | 'CALENDAR'
  | 'FOCUS'
  | 'GAMIFICATION'
  | 'BACKUP'
  | 'APP';

export type LogTag = KnownLogTag | (string & {});

interface LoggerConfig {
  minLevel: LogLevel;
  enabled: boolean;
  useColors: boolean;
}

const LEVEL_SEVERITY: Record<LogLevel, number> = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
};

// Cores ANSI para terminais CLI (Metro / Node / Android Logcat / iOS Terminal)
const ANSI_COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[90m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  DEBUG: ANSI_COLORS.magenta,
  INFO: ANSI_COLORS.cyan,
  WARN: ANSI_COLORS.yellow,
  ERROR: ANSI_COLORS.red,
};

const WEB_LEVEL_STYLES: Record<LogLevel, string> = {
  DEBUG: 'color: #A855F7; font-weight: bold;',
  INFO: 'color: #06B6D4; font-weight: bold;',
  WARN: 'color: #F59E0B; font-weight: bold;',
  ERROR: 'color: #EF4444; font-weight: bold;',
};

class MomentusLogger {
  private config: LoggerConfig = {
    minLevel: __DEV__ ? 'DEBUG' : 'INFO',
    enabled: true,
    useColors: Platform.OS !== 'web',
  };

  public setMinLevel(level: LogLevel) {
    this.config.minLevel = level;
  }

  public setEnabled(enabled: boolean) {
    this.config.enabled = enabled;
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    return LEVEL_SEVERITY[level] >= LEVEL_SEVERITY[this.config.minLevel];
  }

  private getTimestamp(): string {
    const now = new Date();
    const pad = (n: number, z = 2) => String(n).padStart(z, '0');
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    const ms = pad(now.getMilliseconds(), 3);
    return `${hh}:${mm}:${ss}.${ms}`;
  }

  private formatMessage(
    level: LogLevel,
    tag: LogTag,
    message: string
  ): { formatted: string; prefixStyles?: string[] } {
    const time = this.getTimestamp();

    if (Platform.OS === 'web') {
      const prefix = `%c[${time}] [${level}] [${tag}]`;
      const style = WEB_LEVEL_STYLES[level] || 'font-weight: bold;';
      return {
        formatted: `${prefix} ${message}`,
        prefixStyles: [style],
      };
    }

    if (this.config.useColors) {
      const levelColor = LEVEL_COLORS[level] || ANSI_COLORS.reset;
      const tagColor = ANSI_COLORS.green;
      const timeColor = ANSI_COLORS.dim;

      const prefix = `${timeColor}${time}${ANSI_COLORS.reset} ${levelColor}${ANSI_COLORS.bold}[${level}]${ANSI_COLORS.reset} ${tagColor}[${tag}]${ANSI_COLORS.reset}`;
      return { formatted: `${prefix} ${message}` };
    }

    return { formatted: `[${time}] [${level}] [${tag}] ${message}` };
  }

  public log(level: LogLevel, tag: LogTag, message: string, ...optionalParams: any[]) {
    if (!this.shouldLog(level)) return;

    const { formatted, prefixStyles } = this.formatMessage(level, tag, message);
    const args =
      prefixStyles && prefixStyles.length > 0
        ? [formatted, ...prefixStyles, ...optionalParams]
        : [formatted, ...optionalParams];

    switch (level) {
      case 'DEBUG':
        console.debug(...args);
        break;
      case 'INFO':
        console.info(...args);
        break;
      case 'WARN':
        console.warn(...args);
        break;
      case 'ERROR':
        console.error(...args);
        break;
    }
  }

  public debug(tag: LogTag, message: string, ...optionalParams: any[]) {
    this.log('DEBUG', tag, message, ...optionalParams);
  }

  public info(tag: LogTag, message: string, ...optionalParams: any[]) {
    this.log('INFO', tag, message, ...optionalParams);
  }

  public warn(tag: LogTag, message: string, ...optionalParams: any[]) {
    this.log('WARN', tag, message, ...optionalParams);
  }

  public error(tag: LogTag, message: string, ...optionalParams: any[]) {
    this.log('ERROR', tag, message, ...optionalParams);
  }

  // Atalhos semânticos para os domínios mais frequentes do Momentus
  public readonly auth = {
    debug: (msg: string, ...params: any[]) => this.debug('AUTH', msg, ...params),
    info: (msg: string, ...params: any[]) => this.info('AUTH', msg, ...params),
    warn: (msg: string, ...params: any[]) => this.warn('AUTH', msg, ...params),
    error: (msg: string, ...params: any[]) => this.error('AUTH', msg, ...params),
  };

  public readonly sync = {
    debug: (msg: string, ...params: any[]) => this.debug('SYNC', msg, ...params),
    info: (msg: string, ...params: any[]) => this.info('SYNC', msg, ...params),
    warn: (msg: string, ...params: any[]) => this.warn('SYNC', msg, ...params),
    error: (msg: string, ...params: any[]) => this.error('SYNC', msg, ...params),
  };

  public readonly db = {
    debug: (msg: string, ...params: any[]) => this.debug('DB', msg, ...params),
    info: (msg: string, ...params: any[]) => this.info('DB', msg, ...params),
    warn: (msg: string, ...params: any[]) => this.warn('DB', msg, ...params),
    error: (msg: string, ...params: any[]) => this.error('DB', msg, ...params),
  };

  public readonly notif = {
    debug: (msg: string, ...params: any[]) => this.debug('NOTIF', msg, ...params),
    info: (msg: string, ...params: any[]) => this.info('NOTIF', msg, ...params),
    warn: (msg: string, ...params: any[]) => this.warn('NOTIF', msg, ...params),
    error: (msg: string, ...params: any[]) => this.error('NOTIF', msg, ...params),
  };

  public readonly calendar = {
    debug: (msg: string, ...params: any[]) => this.debug('CALENDAR', msg, ...params),
    info: (msg: string, ...params: any[]) => this.info('CALENDAR', msg, ...params),
    warn: (msg: string, ...params: any[]) => this.warn('CALENDAR', msg, ...params),
    error: (msg: string, ...params: any[]) => this.error('CALENDAR', msg, ...params),
  };

  public readonly focus = {
    debug: (msg: string, ...params: any[]) => this.debug('FOCUS', msg, ...params),
    info: (msg: string, ...params: any[]) => this.info('FOCUS', msg, ...params),
    warn: (msg: string, ...params: any[]) => this.warn('FOCUS', msg, ...params),
    error: (msg: string, ...params: any[]) => this.error('FOCUS', msg, ...params),
  };
}

export const MomentusLog = new MomentusLogger();
export const logger = MomentusLog;
export default MomentusLog;
