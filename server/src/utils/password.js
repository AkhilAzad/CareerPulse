const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

/**
 * Hash a plain text password using bcrypt
 * @param {string} password Plain text password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
};

/**
 * Compare a plain text candidate password with a stored hash
 * @param {string} candidatePassword Plain text candidate password
 * @param {string} passwordHash Stored hash
 * @returns {Promise<boolean>} True if match, false otherwise
 */
const comparePassword = async (candidatePassword, passwordHash) => {
  if (!candidatePassword || !passwordHash) {
    return false;
  }
  return bcrypt.compare(candidatePassword, passwordHash);
};

module.exports = {
  hashPassword,
  comparePassword,
};
