const escapeRegex = (value) => value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');

const matchesOriginPattern = (origin, pattern) => {
  if (pattern === '*') return true;
  if (pattern === origin) return true;
  if (!pattern.includes('*')) return false;

  const regex = new RegExp(`^${pattern.split('*').map(escapeRegex).join('.*')}$`);
  return regex.test(origin);
};

const isOriginAllowed = (origin, allowedOrigins) => {
  if (!origin) return true;
  return allowedOrigins.some((pattern) => matchesOriginPattern(origin, pattern));
};

const createCorsOriginHandler = (allowedOrigins) => (origin, callback) => {
  callback(null, isOriginAllowed(origin, allowedOrigins));
};

module.exports = {
  createCorsOriginHandler,
  isOriginAllowed,
};
