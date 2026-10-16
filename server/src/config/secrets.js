if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required in production');
}

const SESSION_SECRET = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production'
  ? (() => { throw new Error('SESSION_SECRET is required'); })()
  : 'dev_only_secret_do_not_use_in_production');

if (process.env.NODE_ENV !== 'production' && !process.env.SESSION_SECRET) {
  console.warn('WARNING: Using development session secret. Set SESSION_SECRET for this environment.');
}

module.exports = { SESSION_SECRET };
