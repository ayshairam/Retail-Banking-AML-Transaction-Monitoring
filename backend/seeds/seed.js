/* eslint-disable no-console */
/**
 * Seed script for the CBA Retail Banking & AML Transaction Monitoring System.
 *
 * Wipes and repopulates the configured database with:
 *  - the three configurable AML rules (LARGE_TRANSACTION, HIGH_FREQUENCY, STRUCTURING)
 *  - a configurable location-risk table
 *  - an admin, an employee, and several demo customers with accounts
 *  - realistic transaction history that is run through the REAL transaction service and
 *    AML engine (not hand-inserted), so every seeded alert/risk score was genuinely computed
 *    by the same code path the running application uses.
 *
 * Run with: npm run seed  (from backend/)
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/db');
const {
  User,
  Customer,
  Account,
  Transaction,
  AmlRule,
  AmlAlert,
  AuditLog,
  LocationRisk,
  RevokedToken,
} = require('../src/models');
const { ROLES, ACCOUNT_STATUS, RISK_LEVEL, ALERT_SEVERITY, RULE_TYPE } = require('../src/utils/constants');
const generateAccountNumber = require('../src/utils/generateAccountNumber');
const transactionService = require('../src/services/transactionService');

const SALT_ROUNDS = 12;

async function wipeDatabase() {
  console.log('Clearing existing collections...');
  await Promise.all([
    User.deleteMany({}),
    Customer.deleteMany({}),
    Account.deleteMany({}),
    Transaction.deleteMany({}),
    AmlRule.deleteMany({}),
    AmlAlert.deleteMany({}),
    AuditLog.deleteMany({}),
    LocationRisk.deleteMany({}),
    RevokedToken.deleteMany({}),
  ]);
}

async function seedAmlRules() {
  console.log('Seeding AML rules...');
  const rules = await AmlRule.insertMany([
    {
      ruleCode: 'LARGE_TRANSACTION',
      ruleName: 'Large Transaction',
      description:
        'Flags any single transaction whose amount strictly exceeds the configured reporting threshold.',
      ruleType: RULE_TYPE.LARGE_TRANSACTION,
      enabled: true,
      threshold: 1000000,
      timeWindowMinutes: null,
      minTransactionCount: null,
      config: {},
      severity: ALERT_SEVERITY.HIGH,
    },
    {
      ruleCode: 'HIGH_FREQUENCY',
      ruleName: 'High Frequency Transactions',
      description:
        'Flags a customer performing an unusually high number of transactions within a short rolling time window.',
      ruleType: RULE_TYPE.HIGH_FREQUENCY,
      enabled: true,
      threshold: null,
      timeWindowMinutes: 10,
      minTransactionCount: 6,
      config: {},
      severity: ALERT_SEVERITY.MEDIUM,
    },
    {
      ruleCode: 'STRUCTURING',
      ruleName: 'Structuring / Threshold Avoidance',
      description:
        'Flags multiple transactions from the same customer that each sit just below the large-transaction reporting threshold within a monitoring window, consistent with structuring/smurfing.',
      ruleType: RULE_TYPE.STRUCTURING,
      enabled: true,
      threshold: 1000000,
      timeWindowMinutes: 1440,
      minTransactionCount: 3,
      config: { percentBelowThreshold: 10 },
      severity: ALERT_SEVERITY.HIGH,
    },
  ]);
  return rules;
}

async function seedLocationRisk() {
  console.log('Seeding location risk configuration...');
  await LocationRisk.insertMany([
    { location: 'Bengaluru, IN', isHighRisk: false, riskScore: 0, notes: 'Head office city - baseline' },
    { location: 'Mumbai, IN', isHighRisk: false, riskScore: 0, notes: 'Major metro' },
    { location: 'Delhi, IN', isHighRisk: false, riskScore: 0, notes: 'Major metro' },
    { location: 'Chennai, IN', isHighRisk: false, riskScore: 0, notes: 'Major metro' },
    { location: 'Pune, IN', isHighRisk: false, riskScore: 2, notes: 'Secondary metro' },
    { location: 'Hyderabad, IN', isHighRisk: false, riskScore: 2, notes: 'Secondary metro' },
    {
      location: 'International Transfer Zone (Config Example)',
      isHighRisk: true,
      riskScore: 15,
      notes: 'Example configurable elevated-risk corridor - edit via admin configuration, not code.',
    },
    {
      location: 'Unverified Remote Location',
      isHighRisk: true,
      riskScore: 18,
      notes: 'Example configurable high-risk entry for locations with no established customer history.',
    },
  ]);
}

async function createUser({ name, email, phone, password, role }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  return User.create({ name, email, phone, passwordHash, role, isActive: true });
}

async function createCustomerWithAccount({ name, email, phone, password, customerRiskLevel = RISK_LEVEL.LOW, openingBalance = 50000 }) {
  const user = await createUser({ name, email, phone, password, role: ROLES.CUSTOMER });
  const customer = await Customer.create({ user: user._id, name, email, phone, customerRiskLevel });
  const accountNumber = await generateAccountNumber();
  const account = await Account.create({
    accountNumber,
    customer: customer._id,
    balance: openingBalance,
    currency: 'INR',
    status: ACCOUNT_STATUS.ACTIVE,
  });
  return { user, customer, account };
}

async function tx(actingUser, accountId, payload) {
  return transactionService.createTransaction({ accountId, ...payload }, actingUser, null);
}

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cba_banking_aml';
  console.log(`Connecting to ${uri}...`);
  await connectDB(uri);

  await wipeDatabase();
  await seedAmlRules();
  await seedLocationRisk();

  console.log('Creating admin and employee users...');
  const admin = await createUser({
    name: 'System Administrator',
    email: 'admin@bank.com',
    phone: '+919900000001',
    password: 'Admin@1234',
    role: ROLES.ADMIN,
  });
  await createUser({
    name: 'Priya Sharma',
    email: 'employee@bank.com',
    phone: '+919900000002',
    password: 'Employee@1234',
    role: ROLES.EMPLOYEE,
  });

  console.log('Creating demo customers...');
  const alice = await createCustomerWithAccount({
    name: 'Alice Fernandes',
    email: 'alice.customer@bank.com',
    phone: '+919900000010',
    password: 'Customer@1234',
    openingBalance: 250000,
  });
  const bob = await createCustomerWithAccount({
    name: 'Bob Menon',
    email: 'bob.customer@bank.com',
    phone: '+919900000011',
    password: 'Customer@1234',
    openingBalance: 150000,
  });
  const carol = await createCustomerWithAccount({
    name: 'Carol D Souza',
    email: 'carol.customer@bank.com',
    phone: '+919900000012',
    password: 'Customer@1234',
    openingBalance: 6000000, // must comfortably cover all four structuring-scenario withdrawals below
  });
  const dave = await createCustomerWithAccount({
    name: 'Dave Kulkarni',
    email: 'dave.customer@bank.com',
    phone: '+919900000013',
    password: 'Customer@1234',
    customerRiskLevel: RISK_LEVEL.CRITICAL,
    openingBalance: 5000000,
  });
  const eve = await createCustomerWithAccount({
    name: 'Eve Reddy',
    email: 'eve.customer@bank.com',
    phone: '+919900000014',
    password: 'Customer@1234',
    openingBalance: 80000,
  });
  const frank = await createCustomerWithAccount({
    name: 'Frank Pillai',
    email: 'frank.customer@bank.com',
    phone: '+919900000015',
    password: 'Customer@1234',
    openingBalance: 100000,
  });

  console.log('Seeding normal transaction history...');
  await tx(admin, alice.account._id, { type: 'DEPOSIT', amount: 15000, location: 'Bengaluru, IN', description: 'Salary credit' });
  await tx(admin, alice.account._id, { type: 'PAYMENT', amount: 2200, location: 'Bengaluru, IN', description: 'Electricity bill' });
  await tx(admin, bob.account._id, { type: 'DEPOSIT', amount: 20000, location: 'Mumbai, IN', description: 'Salary credit' });
  await tx(admin, bob.account._id, { type: 'WITHDRAWAL', amount: 5000, location: 'Mumbai, IN', description: 'ATM withdrawal' });
  await tx(admin, frank.account._id, { type: 'DEPOSIT', amount: 12000, location: 'Chennai, IN', description: 'Salary credit' });
  await tx(admin, frank.account._id, {
    type: 'TRANSFER',
    amount: 4000,
    location: 'Chennai, IN',
    description: 'Rent share',
    destinationAccountNumber: eve.account.accountNumber,
  });

  console.log('Demo Scenario 1 - Large Transaction (> Rs 10,00,000)...');
  await tx(admin, alice.account._id, {
    type: 'DEPOSIT',
    amount: 1500000,
    location: 'Bengaluru, IN',
    description: 'Large property sale proceeds',
  });

  console.log('Demo Scenario 2 - High Frequency (6 transactions within 10 minutes)...');
  for (let i = 0; i < 6; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await tx(admin, bob.account._id, {
      type: 'WITHDRAWAL',
      amount: 3000 + i * 100,
      location: 'Mumbai, IN',
      description: `Rapid ATM withdrawal #${i + 1}`,
    });
  }

  console.log('Demo Scenario 3 - Structuring (multiple transactions just below Rs 10,00,000)...');
  const structuringAmounts = [980000, 975000, 990000, 995000];
  // eslint-disable-next-line no-restricted-syntax
  for (const amount of structuringAmounts) {
    // eslint-disable-next-line no-await-in-loop
    await tx(admin, carol.account._id, {
      type: 'WITHDRAWAL',
      amount,
      location: 'Bengaluru, IN',
      description: 'Cash withdrawal',
    });
  }

  console.log('Demo Scenario 4 - High/Critical risk score (large amount + frequency + high-risk location + critical customer)...');
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await tx(admin, dave.account._id, {
      type: 'WITHDRAWAL',
      amount: 10000 + i * 500,
      location: 'Unverified Remote Location',
      description: `Preliminary movement #${i + 1}`,
    });
  }
  await tx(admin, dave.account._id, {
    type: 'WITHDRAWAL',
    amount: 1200000,
    location: 'Unverified Remote Location',
    description: 'High risk composite scenario transaction',
  });

  console.log('Demo Scenario 5 - Frozen account (transaction attempts must be rejected)...');
  eve.account.status = ACCOUNT_STATUS.FROZEN;
  eve.account.frozenAt = new Date();
  eve.account.frozenReason = 'Seeded demo: frozen for suspected compromised card';
  await eve.account.save();
  try {
    await tx(admin, eve.account._id, { type: 'WITHDRAWAL', amount: 1000, location: 'Bengaluru, IN' });
    console.log('  WARNING: transaction against frozen account unexpectedly succeeded');
  } catch (err) {
    console.log(`  OK - transaction correctly rejected: ${err.message}`);
  }

  console.log('Demo Scenario 6 - Disabled rule (ready for live demo via Admin UI)...');
  console.log('  All rules are seeded ENABLED. To demonstrate: log in as admin, disable a rule');
  console.log('  in AML Rule Management, then create a transaction that would otherwise trigger it.');

  const [customerCount, accountCount, txCount, alertCount] = await Promise.all([
    Customer.countDocuments({}),
    Account.countDocuments({}),
    Transaction.countDocuments({}),
    AmlAlert.countDocuments({}),
  ]);

  console.log('\n================ SEED COMPLETE ================');
  console.log(`Customers: ${customerCount}, Accounts: ${accountCount}, Transactions: ${txCount}, AML Alerts: ${alertCount}`);
  console.log('\nDemo credentials:');
  console.log('  Admin:    admin@bank.com / Admin@1234');
  console.log('  Employee: employee@bank.com / Employee@1234');
  console.log('  Customer: alice.customer@bank.com / Customer@1234 (large transaction scenario)');
  console.log('  Customer: bob.customer@bank.com / Customer@1234 (frequency scenario)');
  console.log('  Customer: carol.customer@bank.com / Customer@1234 (structuring scenario)');
  console.log('  Customer: dave.customer@bank.com / Customer@1234 (high/critical risk scenario)');
  console.log('  Customer: eve.customer@bank.com / Customer@1234 (frozen account scenario)');
  console.log('  Customer: frank.customer@bank.com / Customer@1234 (normal activity)');
  console.log('=================================================\n');

  await disconnectDB();
  await mongoose.connection.close().catch(() => {});
  process.exit(0);
}

run().catch(async (err) => {
  console.error('Seed script failed:', err);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
