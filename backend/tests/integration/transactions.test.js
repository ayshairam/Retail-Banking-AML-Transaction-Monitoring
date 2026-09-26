const request = require('supertest');
const app = require('../../src/app');
const { dbDescribe } = require('../dbAvailable');
const { seedDefaultRules, seedLocationRisk, createCustomerWithAccount, createAdmin } = require('../helpers');

dbDescribe('Transactions API', () => {
  beforeEach(async () => {
    await seedDefaultRules();
    await seedLocationRisk();
  });

  test('a customer can deposit into their own account and the balance updates atomically', async () => {
    const { account, token } = await createCustomerWithAccount({
      email: 'dep@example.com',
      phone: '+919911110001',
      balance: 1000,
    });
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ accountId: account._id.toString(), type: 'DEPOSIT', amount: 500, location: 'Bengaluru, IN' });

    expect(res.status).toBe(201);
    expect(res.body.data.transaction.balanceAfter).toBe(1500);
  });

  test('a withdrawal larger than the balance is rejected (insufficient balance)', async () => {
    const { account, token } = await createCustomerWithAccount({
      email: 'insuff@example.com',
      phone: '+919911110002',
      balance: 100,
    });
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ accountId: account._id.toString(), type: 'WITHDRAWAL', amount: 5000 });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('INSUFFICIENT_BALANCE');
  });

  test('a transaction against a frozen account is rejected', async () => {
    const { account, token } = await createCustomerWithAccount({
      email: 'frozen@example.com',
      phone: '+919911110003',
      balance: 10000,
    });
    account.status = 'FROZEN';
    await account.save();

    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ accountId: account._id.toString(), type: 'DEPOSIT', amount: 500 });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('ACCOUNT_FROZEN');
  });

  test('rejects an invalid amount (<= 0)', async () => {
    const { account, token } = await createCustomerWithAccount({ email: 'zero@example.com', phone: '+919911110004' });
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ accountId: account._id.toString(), type: 'DEPOSIT', amount: 0 });
    expect(res.status).toBe(400);
  });

  test('rejects an invalid transaction type', async () => {
    const { account, token } = await createCustomerWithAccount({ email: 'badtype@example.com', phone: '+919911110005' });
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ accountId: account._id.toString(), type: 'BOGUS', amount: 100 });
    expect(res.status).toBe(400);
  });

  test('rejects transacting on a nonexistent account', async () => {
    const { token } = await createCustomerWithAccount({ email: 'nx@example.com', phone: '+919911110006' });
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ accountId: '507f1f77bcf86cd799439099', type: 'DEPOSIT', amount: 100 });
    expect(res.status).toBe(404);
  });

  test("a customer cannot transact on another customer's account (403)", async () => {
    const owner = await createCustomerWithAccount({ email: 'owner@example.com', phone: '+919911110007' });
    const other = await createCustomerWithAccount({ email: 'other@example.com', phone: '+919911110008' });
    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${other.token}`)
      .send({ accountId: owner.account._id.toString(), type: 'DEPOSIT', amount: 100 });
    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('RESOURCE_OWNERSHIP_VIOLATION');
  });

  test('TRANSFER safely debits source and credits destination', async () => {
    const source = await createCustomerWithAccount({ email: 'src@example.com', phone: '+919911110009', balance: 10000 });
    const dest = await createCustomerWithAccount({ email: 'dst@example.com', phone: '+919911110010', balance: 0 });

    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${source.token}`)
      .send({
        accountId: source.account._id.toString(),
        type: 'TRANSFER',
        amount: 2500,
        destinationAccountNumber: dest.account.accountNumber,
      });
    expect(res.status).toBe(201);

    const { Account } = require('../../src/models');
    const updatedSource = await Account.findById(source.account._id);
    const updatedDest = await Account.findById(dest.account._id);
    expect(updatedSource.balance).toBe(7500);
    expect(updatedDest.balance).toBe(2500);
  });

  test('duplicate transaction prevention via idempotencyKey returns the original transaction', async () => {
    const { account, token } = await createCustomerWithAccount({ email: 'idem@example.com', phone: '+919911110011', balance: 5000 });
    const payload = { accountId: account._id.toString(), type: 'DEPOSIT', amount: 200, idempotencyKey: 'unique-key-1' };

    const res1 = await request(app).post('/api/transactions').set('Authorization', `Bearer ${token}`).send(payload);
    const res2 = await request(app).post('/api/transactions').set('Authorization', `Bearer ${token}`).send(payload);

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
    expect(res1.body.data.transaction._id).toBe(res2.body.data.transaction._id);
  });

  describe('AML boundary: LARGE_TRANSACTION (₹10,00,000)', () => {
    test('exactly ₹10,00,000 does NOT generate an alert', async () => {
      const { account, token } = await createCustomerWithAccount({
        email: 'boundary1@example.com',
        phone: '+919911110012',
        balance: 5000000,
      });
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({ accountId: account._id.toString(), type: 'WITHDRAWAL', amount: 1000000 });
      expect(res.status).toBe(201);
      expect(res.body.data.alertGenerated).toBe(false);
    });

    test('₹10,00,001 DOES generate an alert', async () => {
      const { account, token } = await createCustomerWithAccount({
        email: 'boundary2@example.com',
        phone: '+919911110013',
        balance: 5000000,
      });
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({ accountId: account._id.toString(), type: 'WITHDRAWAL', amount: 1000001 });
      expect(res.status).toBe(201);
      expect(res.body.data.alertGenerated).toBe(true);
      expect(res.body.data.alert.triggeredRules.some((r) => r.ruleCode === 'LARGE_TRANSACTION')).toBe(true);
    });
  });

  describe('AML boundary: HIGH_FREQUENCY (>5 in 10 minutes)', () => {
    test('exactly 5 transactions does not trigger a frequency alert', async () => {
      const { account, token } = await createCustomerWithAccount({
        email: 'freq5@example.com',
        phone: '+919911110014',
        balance: 100000,
      });
      let lastRes;
      // eslint-disable-next-line no-restricted-syntax
      for (let i = 0; i < 5; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        lastRes = await request(app)
          .post('/api/transactions')
          .set('Authorization', `Bearer ${token}`)
          .send({ accountId: account._id.toString(), type: 'WITHDRAWAL', amount: 100 + i });
      }
      const hasFrequencyAlert = lastRes.body.data.alert?.triggeredRules?.some((r) => r.ruleCode === 'HIGH_FREQUENCY');
      expect(hasFrequencyAlert).toBeFalsy();
    });

    test('the 6th transaction within 10 minutes triggers a frequency alert', async () => {
      const { account, token } = await createCustomerWithAccount({
        email: 'freq6@example.com',
        phone: '+919911110015',
        balance: 100000,
      });
      let lastRes;
      // eslint-disable-next-line no-restricted-syntax
      for (let i = 0; i < 6; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        lastRes = await request(app)
          .post('/api/transactions')
          .set('Authorization', `Bearer ${token}`)
          .send({ accountId: account._id.toString(), type: 'WITHDRAWAL', amount: 100 + i });
      }
      const hasFrequencyAlert = lastRes.body.data.alert?.triggeredRules?.some((r) => r.ruleCode === 'HIGH_FREQUENCY');
      expect(hasFrequencyAlert).toBe(true);
    });
  });

  describe('AML: STRUCTURING', () => {
    test('multiple transactions just below the reporting threshold trigger a structuring alert', async () => {
      const { account, token } = await createCustomerWithAccount({
        email: 'structuring@example.com',
        phone: '+919911110016',
        balance: 5000000,
      });
      const amounts = [980000, 975000, 990000];
      let lastRes;
      // eslint-disable-next-line no-restricted-syntax
      for (const amount of amounts) {
        // eslint-disable-next-line no-await-in-loop
        lastRes = await request(app)
          .post('/api/transactions')
          .set('Authorization', `Bearer ${token}`)
          .send({ accountId: account._id.toString(), type: 'WITHDRAWAL', amount });
      }
      const hasStructuringAlert = lastRes.body.data.alert?.triggeredRules?.some((r) => r.ruleCode === 'STRUCTURING');
      expect(hasStructuringAlert).toBe(true);
    });
  });

  describe('AML rule configuration', () => {
    test('disabling LARGE_TRANSACTION via admin prevents it from triggering', async () => {
      const { AmlRule } = require('../../src/models');
      await AmlRule.updateOne({ ruleCode: 'LARGE_TRANSACTION' }, { enabled: false });

      const { account, token } = await createCustomerWithAccount({
        email: 'disabled@example.com',
        phone: '+919911110017',
        balance: 5000000,
      });
      const res = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({ accountId: account._id.toString(), type: 'WITHDRAWAL', amount: 2000000 });

      expect(res.status).toBe(201);
      const triggeredCodes = (res.body.data.alert?.triggeredRules || []).map((r) => r.ruleCode);
      expect(triggeredCodes).not.toContain('LARGE_TRANSACTION');
    });
  });

  describe('GET /api/transactions/search', () => {
    test('an employee can search/filter/paginate transactions', async () => {
      const { account, token } = await createCustomerWithAccount({
        email: 'search@example.com',
        phone: '+919911110018',
        balance: 100000,
      });
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({ accountId: account._id.toString(), type: 'DEPOSIT', amount: 1234 });

      const { token: employeeToken } = await require('../helpers').createEmployee('search-employee@example.com');
      const res = await request(app)
        .get('/api/transactions/search?page=1&limit=10&type=DEPOSIT')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.meta.page).toBe(1);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('a customer cannot access the employee search endpoint (403)', async () => {
      const { token } = await createCustomerWithAccount({ email: 'noaccess@example.com', phone: '+919911110019' });
      const res = await request(app).get('/api/transactions/search').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });
});
