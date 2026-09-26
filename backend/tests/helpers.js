const bcrypt = require('bcryptjs');
const { User, Customer, Account, AmlRule, LocationRisk } = require('../src/models');
const { signToken } = require('../src/utils/token');
const { ROLES, ACCOUNT_STATUS, ALERT_SEVERITY, RULE_TYPE } = require('../src/utils/constants');
const generateAccountNumber = require('../src/utils/generateAccountNumber');

async function seedDefaultRules(overrides = {}) {
  const defs = [
    {
      ruleCode: 'LARGE_TRANSACTION',
      ruleName: 'Large Transaction',
      description: 'Flags transactions above the configured threshold.',
      ruleType: RULE_TYPE.LARGE_TRANSACTION,
      enabled: true,
      threshold: 1000000,
      severity: ALERT_SEVERITY.HIGH,
    },
    {
      ruleCode: 'HIGH_FREQUENCY',
      ruleName: 'High Frequency Transactions',
      description: 'Flags high transaction frequency.',
      ruleType: RULE_TYPE.HIGH_FREQUENCY,
      enabled: true,
      timeWindowMinutes: 10,
      minTransactionCount: 6,
      severity: ALERT_SEVERITY.MEDIUM,
    },
    {
      ruleCode: 'STRUCTURING',
      ruleName: 'Structuring',
      description: 'Flags structuring behaviour.',
      ruleType: RULE_TYPE.STRUCTURING,
      enabled: true,
      threshold: 1000000,
      timeWindowMinutes: 1440,
      minTransactionCount: 3,
      config: { percentBelowThreshold: 10 },
      severity: ALERT_SEVERITY.HIGH,
    },
  ];
  const merged = defs.map((d) => ({ ...d, ...(overrides[d.ruleCode] || {}) }));
  return AmlRule.insertMany(merged);
}

async function seedLocationRisk() {
  await LocationRisk.insertMany([
    { location: 'Bengaluru, IN', isHighRisk: false, riskScore: 0 },
    { location: 'High Risk Test Zone', isHighRisk: true, riskScore: 18 },
  ]);
}

async function createUser({ name = 'Test User', email, phone, password = 'Password@123', role = ROLES.CUSTOMER }) {
  const passwordHash = await bcrypt.hash(password, 4); // low rounds for fast tests
  return User.create({ name, email, phone, passwordHash, role, isActive: true });
}

async function createCustomerWithAccount({
  name = 'Test Customer',
  email,
  phone,
  password = 'Password@123',
  customerRiskLevel = 'LOW',
  balance = 500000,
}) {
  const user = await createUser({ name, email, phone, password, role: ROLES.CUSTOMER });
  const customer = await Customer.create({ user: user._id, name, email, phone, customerRiskLevel });
  const accountNumber = await generateAccountNumber();
  const account = await Account.create({
    accountNumber,
    customer: customer._id,
    balance,
    currency: 'INR',
    status: ACCOUNT_STATUS.ACTIVE,
  });
  return { user, customer, account, token: signToken(user) };
}

async function createAdmin(email = 'admin.test@bank.com') {
  const user = await createUser({ name: 'Admin', email, phone: '+919000000001', role: ROLES.ADMIN });
  return { user, token: signToken(user) };
}

async function createEmployee(email = 'employee.test@bank.com') {
  const user = await createUser({ name: 'Employee', email, phone: '+919000000002', role: ROLES.EMPLOYEE });
  return { user, token: signToken(user) };
}

module.exports = {
  seedDefaultRules,
  seedLocationRisk,
  createUser,
  createCustomerWithAccount,
  createAdmin,
  createEmployee,
};
