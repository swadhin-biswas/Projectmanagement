// Fancy logger with chalk and emojis
import chalk from 'chalk';

// Define theme colors using chalk
const colors = {
  reset: chalk.reset,
  bold: chalk.bold,
  dim: chalk.dim,
  red: chalk.rgb(255, 99, 99),
  green: chalk.rgb(41, 204, 106),
  yellow: chalk.rgb(255, 204, 41),
  blue: chalk.rgb(39, 144, 255),
  magenta: chalk.rgb(220, 110, 250),
  cyan: chalk.rgb(44, 204, 204),
  gray: chalk.rgb(150, 150, 150)
};

const icons = {
  info: '🔵',
  success: '✅',
  error: '❌',
  warn: '⚠️',
  debug: '🔍',
  db: '🗃️',
  auth: '🔐',
  user: '👤',
  team: '👥',
  project: '📋',
  api: '🌐',
  time: '⏱️'
};

const getTimestamp = () => {
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  });
  return time;
};

const formatMeta = (meta) => {
  if (!meta || Object.keys(meta).length === 0) return '';
  return Object.entries(meta)
    .map(([key, value]) => `${colors.gray(`${key}=`)}${colors.cyan(value)}`)
    .join(' ');
};

const logger = {
  info: (message, meta = {}) => {
    console.log(`${colors.dim(getTimestamp())} ${icons.info} ${colors.blue(message)} ${formatMeta(meta)}`);
  },
  success: (message, meta = {}) => {
    console.log(`${colors.dim(getTimestamp())} ${icons.success} ${colors.green(message)} ${formatMeta(meta)}`);
  },
  error: (message, meta = {}) => {
    console.error(`${colors.dim(getTimestamp())} ${icons.error} ${colors.red(message)} ${formatMeta(meta)}`);
  },
  warn: (message, meta = {}) => {
    console.warn(`${colors.dim(getTimestamp())} ${icons.warn} ${colors.yellow(message)} ${formatMeta(meta)}`);
  },
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`${colors.dim(getTimestamp())} ${icons.debug} ${colors.magenta(message)} ${formatMeta(meta)}`);
    }
  },
  db: (message, meta = {}) => {
    console.log(`${colors.dim(getTimestamp())} ${icons.db} ${colors.cyan(message)} ${formatMeta(meta)}`);
  },
  auth: (message, meta = {}) => {
    console.log(`${colors.dim(getTimestamp())} ${icons.auth} ${colors.magenta(message)} ${formatMeta(meta)}`);
  },
  user: (message, meta = {}) => {
    console.log(`${colors.dim(getTimestamp())} ${icons.user} ${colors.cyan(message)} ${formatMeta(meta)}`);
  },
  team: (message, meta = {}) => {
    console.log(`${colors.dim(getTimestamp())} ${icons.team} ${colors.blue(message)} ${formatMeta(meta)}`);
  },
  project: (message, meta = {}) => {
    console.log(`${colors.dim(getTimestamp())} ${icons.project} ${colors.green(message)} ${formatMeta(meta)}`);
  },
  api: (method, path, status, time) => {
    const statusColor = status >= 400 ? colors.red : status >= 300 ? colors.yellow : colors.green;
    const methodColor = method === 'GET' ? colors.blue : 
                      method === 'POST' ? colors.green : 
                      method === 'PUT' ? colors.yellow : 
                      method === 'DELETE' ? colors.red : colors.magenta;
    
    console.log(`${colors.dim(getTimestamp())} ${icons.api} ${methodColor(method)} ${path} ${statusColor(status.toString())} ${icons.time} ${colors.cyan(time + 'ms')}`);
  }
};

// Create a middleware for HTTP request logging
export const requestLogger = {
  name: 'request-logger',
  beforeHandle: ({ request, store }) => {
    store.requestStart = Date.now();
  },
  afterHandle: ({ request, set, store }) => {
    const responseTime = Date.now() - store.requestStart;
    logger.api(request.method, request.url, set.status, responseTime);
  }
};

export default logger;
