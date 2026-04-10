const request = require('supertest');

const { app } = require('../index');

const randomSuffix = () => `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const registerPayload = () => {
  const suffix = randomSuffix();
  return {
    username: `user-${suffix}`,
    email: `user-${suffix}@example.com`,
    password: '12345678',
    phone: '0987654321',
  };
};

describe('Auth API', () => {
  it('register -> login -> refresh token should work', async () => {
    const payload = registerPayload();

    const registerRes = await request(app).post('/api/v1/auth/register').send(payload);
    expect(registerRes.statusCode).toBe(201);
    expect(registerRes.body.success).toBe(true);
    expect(registerRes.body.data.accessToken).toBeTruthy();
    expect(registerRes.body.data.refreshToken).toBeTruthy();

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: payload.email,
      password: payload.password,
    });
    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.accessToken).toBeTruthy();
    expect(loginRes.body.data.refreshToken).toBeTruthy();

    const refreshRes = await request(app).post('/api/v1/auth/refresh-token').send({
      refreshToken: loginRes.body.data.refreshToken,
    });
    expect(refreshRes.statusCode).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.data.accessToken).toBeTruthy();
    expect(refreshRes.body.data.refreshToken).toBeTruthy();
  });

  it('logout-all should invalidate previous refresh token', async () => {
    const payload = registerPayload();
    const registerRes = await request(app).post('/api/v1/auth/register').send(payload);
    const { accessToken, refreshToken } = registerRes.body.data;

    const logoutAllRes = await request(app)
      .post('/api/v1/auth/logout-all')
      .set('Authorization', `Bearer ${accessToken}`)
      .send();
    expect(logoutAllRes.statusCode).toBe(200);
    expect(logoutAllRes.body.success).toBe(true);

    const refreshRes = await request(app).post('/api/v1/auth/refresh-token').send({ refreshToken });
    expect(refreshRes.statusCode).toBe(401);
    expect(refreshRes.body.success).toBe(false);
  });
});
