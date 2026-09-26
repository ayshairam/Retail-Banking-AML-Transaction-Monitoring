const request = require('supertest');
const app = require('../../src/app');
const { dbDescribe } = require('../dbAvailable');
const { seedDefaultRules, seedLocationRisk, createEmployee } = require('../helpers');

dbDescribe('End-to-end primary business journey', () => {
  beforeEach(async () => {
    await seedDefaultRules();
    await seedLocationRisk();
  });

  test('register -> login -> view account -> transact -> AML alert -> employee reviews it', async () => {
    // 1. Register
    const registerRes = await request(app).post('/api/auth/register').send({
      name: 'Journey Customer',
      email: 'journey@example.com',
      phone: '+919955550001',
      password: 'Str0ng!Pass',
    });
    expect(registerRes.status).toBe(201);
    const { account } = registerRes.body.data;

    // 2. Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'journey@example.com', password: 'Str0ng!Pass' });
    expect(loginRes.status).toBe(200);
    const { token } = loginRes.body.data;

    // 3. View account & balance
    const accountRes = await request(app).get(`/api/accounts/${account.id}`).set('Authorization', `Bearer ${token}`);
    expect(accountRes.status).toBe(200);
    expect(accountRes.body.data.balance).toBe(0);

    // First deposit funds so a later large withdrawal is possible
    await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ accountId: account.id, type: 'DEPOSIT', amount: 5000000, location: 'Bengaluru, IN' });

    // 4. Perform a transaction that should trigger AML (> Rs 10,00,000)
    const txRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ accountId: account.id, type: 'WITHDRAWAL', amount: 1200000, location: 'Bengaluru, IN' });
    expect(txRes.status).toBe(201);
    expect(txRes.body.data.transaction.isSuspicious).toBe(true);
    expect(txRes.body.data.alertGenerated).toBe(true);
    const alertId = txRes.body.data.alert._id;

    // 5. Transaction status is visible to the customer
    const historyRes = await request(app)
      .get(`/api/transactions/${account.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.some((t) => t._id === txRes.body.data.transaction._id)).toBe(true);

    // 6. Employee logs in, views the alert, reviews it
    const { token: employeeToken } = await createEmployee('journey-employee@example.com');
    const alertRes = await request(app)
      .get(`/api/aml/alerts/${alertId}`)
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(alertRes.status).toBe(200);
    expect(alertRes.body.data.triggeredRules.length).toBeGreaterThan(0);
    expect(alertRes.body.data.riskScore).toBeGreaterThanOrEqual(0);
    expect(alertRes.body.data.riskLevel).toBeDefined();

    const reviewRes = await request(app)
      .put(`/api/aml/alerts/${alertId}/review`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ status: 'CONFIRMED_SUSPICIOUS', reviewNotes: 'Escalated to compliance for further investigation.' });
    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.data.status).toBe('CONFIRMED_SUSPICIOUS');

    // 7. Statement can be downloaded
    const today = new Date().toISOString().slice(0, 10);
    const statementRes = await request(app)
      .get(`/api/transactions/statement/${account.id}?startDate=2020-01-01&endDate=${today}&format=csv`)
      .set('Authorization', `Bearer ${token}`);
    expect(statementRes.status).toBe(200);
    expect(statementRes.headers['content-type']).toContain('text/csv');
  });
});
