const request = require('supertest');
const app = require('../../src/app');
const { dbDescribe } = require('../dbAvailable');
const { createUser } = require('../helpers');

dbDescribe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    const validPayload = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+919900001111',
      password: 'Str0ng!Pass',
    };

    test('registers a new customer, creates a Customer profile and an Account', async () => {
      const res = await request(app).post('/api/auth/register').send(validPayload);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('CUSTOMER');
      expect(res.body.data.account.accountNumber).toBeDefined();
      expect(res.body.data.account.balance).toBe(0);
    });

    test('rejects duplicate email registration (409)', async () => {
      await request(app).post('/api/auth/register').send(validPayload);
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validPayload, phone: '+919900002222' });
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('DUPLICATE_EMAIL');
    });

    test('rejects duplicate phone registration (409)', async () => {
      await request(app).post('/api/auth/register').send(validPayload);
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validPayload, email: 'other@example.com' });
      expect(res.status).toBe(409);
      expect(res.body.errorCode).toBe('DUPLICATE_PHONE');
    });

    test('rejects missing required fields (400)', async () => {
      const res = await request(app).post('/api/auth/register').send({ email: 'x@example.com' });
      expect(res.status).toBe(400);
      expect(res.body.errorCode).toBe('VALIDATION_ERROR');
    });

    test('rejects a weak password (400)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validPayload, email: 'weak@example.com', phone: '+919900003333', password: 'weak' });
      expect(res.status).toBe(400);
    });

    test('never returns the password hash', async () => {
      const res = await request(app).post('/api/auth/register').send(validPayload);
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Login User',
        email: 'login.user@example.com',
        phone: '+919900004444',
        password: 'Str0ng!Pass',
      });
    });

    test('logs in with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login.user@example.com', password: 'Str0ng!Pass' });
      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
    });

    test('rejects an invalid password (401)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login.user@example.com', password: 'WrongPass1!' });
      expect(res.status).toBe(401);
      expect(res.body.errorCode).toBe('INVALID_CREDENTIALS');
    });

    test('rejects a nonexistent email (401, same error as bad password)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'Str0ng!Pass' });
      expect(res.status).toBe(401);
    });
  });

  describe('Protected routes', () => {
    test('rejects a request with a missing token (401)', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.errorCode).toBe('AUTH_TOKEN_MISSING');
    });

    test('rejects a request with an invalid token (401)', async () => {
      const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');
      expect(res.status).toBe(401);
      expect(res.body.errorCode).toBe('AUTH_TOKEN_INVALID');
    });

    test('rejects a request with an expired token (401)', async () => {
      const jwt = require('jsonwebtoken');
      const { jwtSecret } = require('../../src/config/env');
      const expired = jwt.sign({ sub: '000000000000000000000000', role: 'CUSTOMER' }, jwtSecret, {
        expiresIn: -10,
      });
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`);
      expect(res.status).toBe(401);
      expect(res.body.errorCode).toBe('AUTH_TOKEN_EXPIRED');
    });

    test('accepts a valid token and returns the current user', async () => {
      const user = await createUser({ email: 'me@example.com', phone: '+919900005555' });
      const { signToken } = require('../../src/utils/token');
      const token = signToken(user);
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('me@example.com');
    });
  });

  describe('POST /api/auth/logout', () => {
    test('revokes the token so it can no longer be used', async () => {
      const registerRes = await request(app).post('/api/auth/register').send({
        name: 'Logout User',
        email: 'logout.user@example.com',
        phone: '+919900006666',
        password: 'Str0ng!Pass',
      });
      const { token } = registerRes.body.data;

      const logoutRes = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`);
      expect(logoutRes.status).toBe(200);

      const reuseRes = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
      expect(reuseRes.status).toBe(401);
      expect(reuseRes.body.errorCode).toBe('AUTH_TOKEN_REVOKED');
    });
  });
});
