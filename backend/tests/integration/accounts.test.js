const request = require('supertest');
const app = require('../../src/app');
const { dbDescribe } = require('../dbAvailable');
const { createCustomerWithAccount, createEmployee } = require('../helpers');

dbDescribe('Accounts API', () => {
  test('GET /api/accounts/:id - owner can view their own account', async () => {
    const { account, token } = await createCustomerWithAccount({ email: 'a1@example.com', phone: '+919933330001' });
    const res = await request(app).get(`/api/accounts/${account._id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.accountNumber).toBe(account.accountNumber);
  });

  test("GET /api/accounts/:id - another customer cannot view someone else's account (403)", async () => {
    const owner = await createCustomerWithAccount({ email: 'a2@example.com', phone: '+919933330002' });
    const other = await createCustomerWithAccount({ email: 'a3@example.com', phone: '+919933330003' });
    const res = await request(app)
      .get(`/api/accounts/${owner.account._id}`)
      .set('Authorization', `Bearer ${other.token}`);
    expect(res.status).toBe(403);
  });

  test('an employee can freeze an account', async () => {
    const { account } = await createCustomerWithAccount({ email: 'a4@example.com', phone: '+919933330004' });
    const { token } = await createEmployee();
    const res = await request(app)
      .put(`/api/accounts/${account._id}/freeze`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'Suspicious activity under review' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('FROZEN');
  });

  test('an employee can unfreeze a frozen account', async () => {
    const { account } = await createCustomerWithAccount({ email: 'a5@example.com', phone: '+919933330005' });
    const { token } = await createEmployee();
    await request(app).put(`/api/accounts/${account._id}/freeze`).set('Authorization', `Bearer ${token}`).send({});
    const res = await request(app)
      .put(`/api/accounts/${account._id}/unfreeze`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ACTIVE');
  });

  test('a customer cannot freeze accounts (403)', async () => {
    const { account, token } = await createCustomerWithAccount({ email: 'a6@example.com', phone: '+919933330006' });
    const res = await request(app)
      .put(`/api/accounts/${account._id}/freeze`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(403);
  });

  test('freezing an already-frozen account returns a conflict', async () => {
    const { account } = await createCustomerWithAccount({ email: 'a7@example.com', phone: '+919933330007' });
    const { token } = await createEmployee();
    await request(app).put(`/api/accounts/${account._id}/freeze`).set('Authorization', `Bearer ${token}`).send({});
    const res = await request(app)
      .put(`/api/accounts/${account._id}/freeze`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(409);
  });

  test('returns 404 for a nonexistent account', async () => {
    const { token } = await createEmployee();
    const res = await request(app)
      .get('/api/accounts/507f1f77bcf86cd799439099')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
