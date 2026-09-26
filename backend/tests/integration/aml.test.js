const request = require('supertest');
const app = require('../../src/app');
const { dbDescribe } = require('../dbAvailable');
const {
  seedDefaultRules,
  seedLocationRisk,
  createCustomerWithAccount,
  createAdmin,
  createEmployee,
} = require('../helpers');

dbDescribe('AML Alerts & Rules API', () => {
  beforeEach(async () => {
    await seedDefaultRules();
    await seedLocationRisk();
  });

  async function makeLargeTransactionAlert() {
    const { account, token } = await createCustomerWithAccount({
      email: `large-${Date.now()}@example.com`,
      phone: `+9199${Math.floor(Math.random() * 10000000)}`,
      balance: 5000000,
    });
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ accountId: account._id.toString(), type: 'WITHDRAWAL', amount: 1500000 });
    return res.body.data.alert;
  }

  describe('GET /api/aml/alerts', () => {
    test('employees can list alerts', async () => {
      await makeLargeTransactionAlert();
      const { token } = await createEmployee();
      const res = await request(app).get('/api/aml/alerts').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    test('customers cannot list alerts (403)', async () => {
      const { token } = await createCustomerWithAccount({ email: 'cust1@example.com', phone: '+919922220001' });
      const res = await request(app).get('/api/aml/alerts').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/aml/alerts/:id', () => {
    test('returns full alert detail with explainability fields', async () => {
      const alert = await makeLargeTransactionAlert();
      const { token } = await createEmployee();
      const res = await request(app).get(`/api/aml/alerts/${alert._id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.riskScore).toBeDefined();
      expect(res.body.data.riskLevel).toBeDefined();
      expect(res.body.data.triggeredRules.length).toBeGreaterThan(0);
      expect(res.body.data.reason).toBeTruthy();
    });

    test('returns 404 for a nonexistent alert', async () => {
      const { token } = await createEmployee();
      const res = await request(app)
        .get('/api/aml/alerts/507f1f77bcf86cd799439099')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/aml/alerts/:id/review', () => {
    test('an employee can review and resolve an alert', async () => {
      const alert = await makeLargeTransactionAlert();
      const { token } = await createEmployee();
      const res = await request(app)
        .put(`/api/aml/alerts/${alert._id}/review`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'CLEARED', reviewNotes: 'Verified as legitimate large payment.' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CLEARED');
      expect(res.body.data.reviewer).toBeDefined();
      expect(res.body.data.reviewedAt).toBeDefined();
    });

    test('rejects a review with missing notes', async () => {
      const alert = await makeLargeTransactionAlert();
      const { token } = await createEmployee();
      const res = await request(app)
        .put(`/api/aml/alerts/${alert._id}/review`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'CLEARED' });
      expect(res.status).toBe(400);
    });
  });

  describe('AML Rule Management', () => {
    test('admin can view rules', async () => {
      const { token } = await createAdmin();
      const res = await request(app).get('/api/aml/rules').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(3);
    });

    test('employee can view but not modify rules (403 on write)', async () => {
      const { AmlRule } = require('../../src/models');
      const rule = await AmlRule.findOne({ ruleCode: 'LARGE_TRANSACTION' });
      const { token } = await createEmployee();
      const viewRes = await request(app).get('/api/aml/rules').set('Authorization', `Bearer ${token}`);
      expect(viewRes.status).toBe(200);
      const toggleRes = await request(app)
        .put(`/api/aml/rules/${rule._id}/toggle`)
        .set('Authorization', `Bearer ${token}`)
        .send({ enabled: false });
      expect(toggleRes.status).toBe(403);
    });

    test('admin can disable and re-enable a rule', async () => {
      const { AmlRule } = require('../../src/models');
      const rule = await AmlRule.findOne({ ruleCode: 'LARGE_TRANSACTION' });
      const { token } = await createAdmin();

      const disableRes = await request(app)
        .put(`/api/aml/rules/${rule._id}/toggle`)
        .set('Authorization', `Bearer ${token}`)
        .send({ enabled: false });
      expect(disableRes.status).toBe(200);
      expect(disableRes.body.data.enabled).toBe(false);

      const enableRes = await request(app)
        .put(`/api/aml/rules/${rule._id}/toggle`)
        .set('Authorization', `Bearer ${token}`)
        .send({ enabled: true });
      expect(enableRes.body.data.enabled).toBe(true);
    });

    test('admin can update a rule threshold/configuration', async () => {
      const { AmlRule } = require('../../src/models');
      const rule = await AmlRule.findOne({ ruleCode: 'HIGH_FREQUENCY' });
      const { token } = await createAdmin();
      const res = await request(app)
        .put(`/api/aml/rules/${rule._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ timeWindowMinutes: 15, minTransactionCount: 8 });
      expect(res.status).toBe(200);
      expect(res.body.data.timeWindowMinutes).toBe(15);
      expect(res.body.data.minTransactionCount).toBe(8);
    });

    test('rejects an invalid rule configuration (negative window)', async () => {
      const { AmlRule } = require('../../src/models');
      const rule = await AmlRule.findOne({ ruleCode: 'HIGH_FREQUENCY' });
      const { token } = await createAdmin();
      const res = await request(app)
        .put(`/api/aml/rules/${rule._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ timeWindowMinutes: -5 });
      expect(res.status).toBe(400);
    });

    test('returns 404 updating a nonexistent rule', async () => {
      const { token } = await createAdmin();
      const res = await request(app)
        .put('/api/aml/rules/507f1f77bcf86cd799439099')
        .set('Authorization', `Bearer ${token}`)
        .send({ enabled: false });
      expect(res.status).toBe(404);
    });
  });
});
