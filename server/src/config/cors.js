const { FRONTEND_URL, NODE_ENV } = require('./env');

const parseAllowedOrigins = () => {
  const defaults = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
  ];
  if (!FRONTEND_URL) return defaults;

  const userOrigins = FRONTEND_URL.split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  return Array.from(new Set([...defaults, ...userOrigins]));
};

const allowedOrigins = parseAllowedOrigins();

const corsOptions = {
  origin: (origin, callback) => {

    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.replace(/\/+$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    if (NODE_ENV === 'development' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin)) {
      return callback(null, true);
    }

    const error = new Error(`Origin '${origin}' not permitted by CORS policy`);
    error.status = 403;
    return callback(error);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204,
};

module.exports = {
  corsOptions,
  allowedOrigins,
};
