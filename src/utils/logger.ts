import pino from 'pino';
import pretty from 'pino-pretty';
import os from 'os';

// Detect if the environment likely supports emojis
function supportsEmoji(): boolean {
  // Windows classic console often fails, Windows Terminal is fine
  const platform = os.platform();
  // const term = process.env.TERM || '';
  const wtSession = process.env.WT_SESSION; // Windows Terminal sets this

  if (platform === 'win32' && !wtSession) {
    return false; // assume classic PowerShell/Command Prompt
  }
  // Most modern terminals (macOS, Linux, Windows Terminal) support emojis
  return true;
}

const emojiEnabled = supportsEmoji();

// Define symbols for levels
const levelSymbols: Record<string, string> = emojiEnabled
  ? {
      '10': '🔍', // trace
      '20': '🐛', // debug
      '30': 'ℹ️ ', // info
      '40': '⚠️ ', // warn
      '50': '❌', // error
      '60': '💀', // fatal
    }
  : {
      '10': '[TRACE]',
      '20': '[DEBUG]',
      '30': '[INFO]',
      '40': '[WARN]',
      '50': '[ERROR]',
      '60': '[FATAL]',
    };

const stream = pretty({
  colorize: true,
  levelFirst: true,
  translateTime: 'SYS:standard',
  ignore: 'pid,hostname',
  messageFormat: '{msg}',
  customPrettifiers: {
    time: (timestamp) =>
      emojiEnabled ? `🕒 ${timestamp}` : `[TIME] ${timestamp}`,
    level: (level) => {
      const key = String(level);
      return levelSymbols[key] || `[${key}]`;
    },
  },
});

const logger = pino(
  {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
      bindings: (bindings) => ({ pid: bindings.pid }),
    },
    redact: {
      paths: ['password', 'token', '*.password', '*.token', '*.secret'],
      censor: '[REDACTED]',
    },
  },
  stream
);

export default logger;
