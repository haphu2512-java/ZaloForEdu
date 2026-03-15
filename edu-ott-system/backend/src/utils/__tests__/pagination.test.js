const { parsePagination } = require('../pagination');

describe('parsePagination', () => {
  it('uses defaults when page/limit are invalid', () => {
    const result = parsePagination('abc', '0', { page: 1, limit: 20 });

    expect(result).toEqual({
      page: 1,
      limit: 20,
      skip: 0,
    });
  });

  it('returns normalized positive integers', () => {
    const result = parsePagination('2', '15', { page: 1, limit: 10 });

    expect(result).toEqual({
      page: 2,
      limit: 15,
      skip: 15,
    });
  });
});
