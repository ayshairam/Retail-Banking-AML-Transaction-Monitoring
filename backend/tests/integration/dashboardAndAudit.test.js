const request = require('supertest');
const app = require('../../src/app');
const { dbDescribe } = require('../dbAvailable');
const { seedDefaultRules, seedLocationRisk, createCustomerWithAccount, createEmployee, createAdmin } = require('../helpers');

dbDescribe('Dashboard & Audit Log API', () => {
  beforeEach(async () => {
    await seedDefaultRules();
    await seedLocationRisk();
  });

  test('GET /api/dashboard/stats reconciles with persisted data', async () => {
    const { account, token } = await createCustomerWithAccount({
      email: 'dash1@example.com',
      phone: '+919944440001',
      balance: 100000,
    });
    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ accountId: account._id.toString(), type: 'DEPOSIT', amount: 1000 });

    const { token: empToken } = await createEmployee();
    const res = await request(app).get('/api/dashboard/stats').set('Authorization', `Bearer ${empToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.totals.totalTransactions).toBeGreaterThanOrEqual(1);
    expect(res.body.data.totals.totalCustomers).toBeGreaterThanOrEqual(1);
  });

  test('customers cannot access the compliance dashboard (403)', async () => {
    const { token } = await createCustomerWithAccount({ email: 'dash2@example.com', phone: '+919944440002' });
    const res = await request(app).get('/api/dashboard/stats').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('GET /api/dashboard/me returns the customer-facing dashboard', async () => {
    const { token, account } = await createCustomerWithAccount({ email: 'dash3@example.com', phone: '+919944440003', balance: 5000 });
    const res = await request(app).get('/api/dashboard/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.account.accountNumber).toBe(account.accountNumber);
  });

  test('audit logs are recorded for login and only accessible by admin', async () => {
    const customer = await createCustomerWithAccount({ email: 'audit1@example.com', phone: '+919944440004' });
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'audit1@example.com', password: 'Password@123' });

    const { token: adminToken } = await createAdmin();
    const res = await request(app).get('/api/audit-logs').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some((l) => l.action === 'LOGIN')).toBe(true);

    const { token: empToken } = await createEmployee();
    const forbidden = await request(app).get('/api/audit-logs').set('Authorization', `Bearer ${empToken}`);
    expect(forbidden.status).toBe(403);
  });
});
