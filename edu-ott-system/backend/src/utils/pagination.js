const normalizePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

exports.parsePagination = (page, limit, defaults = { page: 1, limit: 10 }) => {
  const safePage = normalizePositiveInt(page, defaults.page);
  const safeLimit = normalizePositiveInt(limit, defaults.limit);

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
};
