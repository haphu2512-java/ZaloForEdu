const request = require('supertest');

const { app } = require('../index');

const randomSuffix = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const registerUser = async ({ usernamePrefix = 'u' } = {}) => {
  const suffix = randomSuffix();
  const payload = {
    username: `${usernamePrefix}-${suffix}`,
    email: `${usernamePrefix}-${suffix}@example.com`,
    password: '12345678',
  };

  const response = await request(app).post('/api/v1/auth/register').send(payload);
  return response.body.data;
};

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

describe('Search API', () => {
  it('search users should return matched user with pagination', async () => {
    const user = await registerUser({ usernamePrefix: 'searchable-user' });

    const response = await request(app)
      .get('/api/v1/search/users?q=searchable-user&page=1&limit=5')
      .set(authHeader(user.accessToken));

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.items.length).toBeGreaterThan(0);
    expect(response.body.data.pagination.page).toBe(1);
    expect(response.body.data.pagination.limit).toBe(5);
  });

  it('search messages should return only messages from member conversations', async () => {
    const user1 = await registerUser({ usernamePrefix: 'search-msg-1' });
    const user2 = await registerUser({ usernamePrefix: 'search-msg-2' });

    const createConversationRes = await request(app)
      .post('/api/v1/conversations')
      .set(authHeader(user1.accessToken))
      .send({
        type: 'direct',
        participantIds: [user2.user.id],
      });
    expect(createConversationRes.statusCode).toBe(201);
    const conversationId = createConversationRes.body.data._id;

    await request(app)
      .post('/api/v1/messages/send')
      .set(authHeader(user1.accessToken))
      .send({
        conversationId,
        content: 'special-search-token',
      });

    const response = await request(app)
      .get('/api/v1/search/messages?q=special-search-token&page=1&limit=10')
      .set(authHeader(user2.accessToken));

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.items.length).toBeGreaterThan(0);
    expect(response.body.data.items[0].content).toContain('special-search-token');
    expect(response.body.data.pagination.total).toBeGreaterThan(0);
  });
});
