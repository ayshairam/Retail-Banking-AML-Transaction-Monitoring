const request = require('supertest');
const app = require('../../src/app');
const { dbDescribe } = require('../dbAvailable');
const { createCustomerWithAccount, createEmployee } = require('../helpers');

dbDescribe('Customers API', () => {
  test('an employee can search customers by name/email/phone/account number', async () => {
    const c = await createCustomerWithAccount({ name: 'Searchable Sam', email: 'sam@example.com', phone: '+919966660001' });
    const { token } = await createEmployee();

    const byName = await request(app).get('/api/customers/search?q=Searchable').set('Authorization', `Bearer ${token}`);
    expect(byName.status).toBe(200);
    expect(byName.body.data.length).toBeGreaterThan(0);

    const byAccount = await request(app)
      .get(`/api/customers/search?q=${c.account.accountNumber}`)
      .set('Authorization', `Bearer ${token}`);
    expect(byAccount.status).toBe(200);
    expect(byAccount.body.data.some((x) => x._id === c.customer._id.toString())).toBe(true);
  });

  test('a customer cannot use the employee search endpoint (403)', async () => {
    const { token } = await createCustomerWithAccount({ email: 'noaccess2@example.com', phone: '+919966660002' });
    const res = await request(app).get('/api/customers/search').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('a customer can view their own profile', async () => {
    const { customer, token } = await createCustomerWithAccount({ email: 'own@example.com', phone: '+919966660003' });
    const res = await request(app).get(`/api/customers/${customer._id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.customer.email).toBe('own@example.com');
  });

  test("a customer cannot view another customer's profile (403)", async () => {
    const a = await createCustomerWithAccount({ email: 'ca@example.com', phone: '+919966660004' });
    const b = await createCustomerWithAccount({ email: 'cb@example.com', phone: '+919966660005' });
    const res = await request(app).get(`/api/customers/${a.customer._id}`).set('Authorization', `Bearer ${b.token}`);
    expect(res.status).toBe(403);
  });

  test('returns 404 for a nonexistent customer', async () => {
    const { token } = await createEmployee();
    const res = await request(app)
      .get('/api/customers/507f1f77bcf86cd799439099')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
