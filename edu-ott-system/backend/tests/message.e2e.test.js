const request = require('supertest');

const { app } = require('../index');

const randomSuffix = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const registerUser = async () => {
  const suffix = randomSuffix();
  const payload = {
    username: `u-${suffix}`,
    email: `u-${suffix}@example.com`,
    password: '12345678',
  };

  const response = await request(app).post('/api/v1/auth/register').send(payload);
  return response.body.data;
};

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

describe('Message API', () => {
  it('create conversation -> send message -> list messages -> mark read', async () => {
    const user1 = await registerUser();
    const user2 = await registerUser();

    const createConversationRes = await request(app)
      .post('/api/v1/conversations')
      .set(authHeader(user1.accessToken))
      .send({
        type: 'direct',
        participantIds: [user2.user.id],
      });
    expect(createConversationRes.statusCode).toBe(201);
    const conversationId = createConversationRes.body.data._id;

    const sendMessageRes = await request(app)
      .post('/api/v1/messages/send')
      .set(authHeader(user1.accessToken))
      .send({
        conversationId,
        content: 'hello from user1',
      });
    expect(sendMessageRes.statusCode).toBe(201);
    expect(sendMessageRes.body.success).toBe(true);
    const messageId = sendMessageRes.body.data._id;

    const listMessagesRes = await request(app)
      .get(`/api/v1/messages/conversation/${conversationId}?limit=20`)
      .set(authHeader(user2.accessToken));
    expect(listMessagesRes.statusCode).toBe(200);
    expect(listMessagesRes.body.success).toBe(true);
    expect(listMessagesRes.body.data.items.length).toBeGreaterThan(0);

    const markReadRes = await request(app)
      .put(`/api/v1/messages/${messageId}/read`)
      .set(authHeader(user2.accessToken))
      .send();
    expect(markReadRes.statusCode).toBe(200);
    expect(markReadRes.body.success).toBe(true);
  });

  it('messages endpoint should return cursor for pagination', async () => {
    const user1 = await registerUser();
    const user2 = await registerUser();

    const createConversationRes = await request(app)
      .post('/api/v1/conversations')
      .set(authHeader(user1.accessToken))
      .send({
        type: 'direct',
        participantIds: [user2.user.id],
      });
    const conversationId = createConversationRes.body.data._id;

    await request(app)
      .post('/api/v1/messages/send')
      .set(authHeader(user1.accessToken))
      .send({ conversationId, content: 'message 1' });
    await request(app)
      .post('/api/v1/messages/send')
      .set(authHeader(user1.accessToken))
      .send({ conversationId, content: 'message 2' });

    const page1 = await request(app)
      .get(`/api/v1/messages/conversation/${conversationId}?limit=1`)
      .set(authHeader(user2.accessToken));
    expect(page1.statusCode).toBe(200);
    expect(page1.body.data.items).toHaveLength(1);
    expect(page1.body.data.nextCursor).toBeTruthy();

    const page2 = await request(app)
      .get(
        `/api/v1/messages/conversation/${conversationId}?limit=1&cursor=${encodeURIComponent(
          page1.body.data.nextCursor,
        )}`,
      )
      .set(authHeader(user2.accessToken));
    expect(page2.statusCode).toBe(200);
    expect(page2.body.data.items).toHaveLength(1);
  });
});
