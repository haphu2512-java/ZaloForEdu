const encodeCursor = ({ createdAt, id }) =>
  Buffer.from(`${new Date(createdAt).toISOString()}|${id}`).toString('base64url');

const decodeCursor = (cursor) => {
  const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
  const [createdAtRaw, id] = decoded.split('|');
  const createdAt = new Date(createdAtRaw);

  if (!createdAtRaw || Number.isNaN(createdAt.getTime()) || !id) {
    return null;
  }

  return { createdAt, id };
};

module.exports = {
  encodeCursor,
  decodeCursor,
};
