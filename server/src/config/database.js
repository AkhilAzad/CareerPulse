const mongoose = require('mongoose');
const { MONGODB_URI } = require('./env');

/**
 * Mask credentials in MongoDB connection strings and error messages
 * to ensure secrets are never leaked into server logs or responses.
 */
const maskCredentials = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@/gi, '$1***:***@')
    .replace(/:\/\/([^:]+):([^@]+)@/g, '://***:***@')
    .replace(/([?&]password=)[^&]+/gi, '$1***')
    .replace(/(password\s*[:=]\s*["']?)[^"'\s,;]+/gi, '$1***')
    .replace(/(password\s+["']?)[^"'\s,;]+/gi, '$1***');
};

let lastConnectionError = null;
let listenersAttached = false;
let isShuttingDown = false;
let reconnectTimer = null;
let reconnectAttempts = 0;
let connectingPromise = null;

/**
 * Standard Mongoose connection options tuned for cloud Atlas clusters
 */
const MONGOOSE_OPTIONS = {
  serverSelectionTimeoutMS: 15000, // 15s allows realistic multi-node DNS SRV lookup and TLS handshake
  socketTimeoutMS: 45000,          // 45s socket keep-alive
  connectTimeoutMS: 15000,         // 15s initial TCP connection timeout
  maxPoolSize: 10,                 // Up to 10 pooled connections
  minPoolSize: 1,                  // Keep 1 warm socket
  family: 4,                       // Force IPv4 to eliminate slow dual-stack IPv6 DNS lookups on Windows
};

/**
 * Schedule automatic background reconnection with exponential backoff and jitter
 */
const scheduleReconnect = (explicitDelayMs = null) => {
  if (isShuttingDown || reconnectTimer || mongoose.connection.readyState === 1) {
    return;
  }

  // Calculate exponential backoff: 5s, 7.5s, 11.2s ... capped at 30s
  const baseDelay = explicitDelayMs || Math.min(30000, Math.round(5000 * Math.pow(1.5, reconnectAttempts)));
  const jitter = Math.floor(Math.random() * 1000);
  const delay = baseDelay + jitter;

  reconnectAttempts++;
  console.log(`[MongoDB] Background reconnection attempt #${reconnectAttempts} scheduled in ${(delay / 1000).toFixed(1)}s...`);

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    if (isShuttingDown || mongoose.connection.readyState === 1) return;

    try {
      console.log(`[MongoDB] Executing background reconnection attempt #${reconnectAttempts}...`);
      await connectDB();
    } catch (err) {
      console.warn(`[MongoDB] Background reconnection attempt #${reconnectAttempts} failed: [${err.name || 'Error'}] ${maskCredentials(err.message)}`);
      scheduleReconnect();
    }
  }, delay);

  // Unref timer so it does not block Node process exit if clean termination requested
  if (reconnectTimer && typeof reconnectTimer.unref === 'function') {
    reconnectTimer.unref();
  }
};

/**
 * Attach lifecycle event listeners once to Mongoose connection
 */
const attachConnectionListeners = () => {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('connected', () => {
    lastConnectionError = null;
    reconnectAttempts = 0;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    console.log(`[MongoDB] Connection established successfully: ${mongoose.connection.host}`);
  });

  mongoose.connection.on('reconnected', () => {
    lastConnectionError = null;
    reconnectAttempts = 0;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    console.log(`[MongoDB] Connection re-established: ${mongoose.connection.host}`);
  });

  mongoose.connection.on('error', (err) => {
    const errorName = err.name || 'Error';
    const sanitizedMsg = maskCredentials(err.message || String(err));
    lastConnectionError = { name: errorName, message: sanitizedMsg, timestamp: new Date() };
    console.error(`[MongoDB] Runtime error: [${errorName}] ${sanitizedMsg}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('[MongoDB] Connection disconnected');
    if (!isShuttingDown) {
      scheduleReconnect(5000);
    }
  });
};

/**
 * Connect to MongoDB Atlas using Mongoose.
 * Reuses active in-flight connection promises and avoids artificial racing timeouts.
 * @returns {Promise<typeof mongoose|null>}
 */
const connectDB = async () => {
  attachConnectionListeners();

  // If already connected, return active connection immediately
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If a connection attempt is already in-flight, return the existing promise
  if (connectingPromise) {
    return connectingPromise;
  }

  const uri = process.env.MONGODB_URI || MONGODB_URI;

  if (!uri) {
    const errorMsg = 'MONGODB_URI is not defined in environment variables';
    lastConnectionError = { name: 'ConfigurationError', message: errorMsg, timestamp: new Date() };
    console.error(`[MongoDB] Connection failed: ${errorMsg}`);
    return null;
  }

  connectingPromise = (async () => {
    try {
      const conn = await mongoose.connect(uri, MONGOOSE_OPTIONS);

      lastConnectionError = null;
      reconnectAttempts = 0;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
      return conn;
    } catch (error) {
      const errorName = error.name || 'Error';
      const sanitizedMessage = maskCredentials(error.message || String(error));
      const errorCode = error.code ? ` (Code: ${error.code})` : '';
      
      lastConnectionError = {
        name: errorName,
        message: `${sanitizedMessage}${errorCode}`,
        timestamp: new Date(),
      };

      console.error(`[MongoDB] Connection failed: [${errorName}] ${sanitizedMessage}${errorCode}`);

      // Start background self-healing reconnection unless shutting down
      if (!isShuttingDown) {
        scheduleReconnect();
      }

      return null;
    } finally {
      connectingPromise = null;
    }
  })();

  return connectingPromise;
};

/**
 * Disconnect from MongoDB cleanly during server shutdown
 */
const disconnectDB = async () => {
  isShuttingDown = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('[MongoDB] Disconnected cleanly');
    }
  } catch (error) {
    console.error(`[MongoDB] Disconnect error: ${maskCredentials(error.message)}`);
  }
};

/**
 * Get current database connection status with detailed diagnostics
 */
const getDatabaseStatus = () => {
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const readyState = mongoose.connection.readyState;
  const status = stateMap[readyState] || 'disconnected';

  return {
    status,
    isConnected: readyState === 1,
    readyState,
    reconnectAttempts,
    ...(readyState === 1 && {
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    }),
    ...(readyState !== 1 && lastConnectionError && {
      error: `[${lastConnectionError.name}] ${lastConnectionError.message}`,
      errorTimestamp: lastConnectionError.timestamp,
    }),
  };
};

module.exports = {
  connectDB,
  disconnectDB,
  getDatabaseStatus,
  maskCredentials,
};
