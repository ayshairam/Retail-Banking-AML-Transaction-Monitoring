const bcrypt = require('bcryptjs');
const { User, Customer, Account, RevokedToken } = require('../models');
const { ROLES, ACCOUNT_STATUS } = require('../utils/constants');
const ApiError = require('../utils/ApiError');
const { signToken, verifyToken } = require('../utils/token');
const generateAccountNumber = require('../utils/generateAccountNumber');
const auditService = require('./auditService');

const SALT_ROUNDS = 12;

async function register({ name, email, phone, password }, req) {
  const [existingEmail, existingPhone] = await Promise.all([
    User.findOne({ email }),
    User.findOne({ phone }),
  ]);
  if (existingEmail) {
    throw ApiError.conflict('An account with this email already exists', 'DUPLICATE_EMAIL');
  }
  if (existingPhone) {
    throw ApiError.conflict('An account with this phone number already exists', 'DUPLICATE_PHONE');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email, phone, passwordHash, role: ROLES.CUSTOMER });

  const customer = await Customer.create({ user: user._id, name, email, phone });

  const accountNumber = await generateAccountNumber();
  const account = await Account.create({
    accountNumber,
    customer: customer._id,
    balance: 0,
    currency: 'INR',
    status: ACCOUNT_STATUS.ACTIVE,
  });

  await auditService.record({
    req,
    user,
    action: 'REGISTER',
    entityType: 'User',
    entityId: user._id,
    newValue: { email, phone, role: ROLES.CUSTOMER },
  });

  const token = signToken(user);
  return { token, user: sanitizeUser(user), customer, account };
}

async function login({ email, password }, req) {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !user.isActive) {
    await auditService.record({
      req,
      action: 'LOGIN',
      entityType: 'User',
      success: false,
      message: `Login failed for ${email}: account not found or inactive`,
    });
    throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    await auditService.record({
      req,
      user,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user._id,
      success: false,
      message: 'Login failed: incorrect password',
    });
    throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  user.lastLoginAt = new Date();
  await user.save();

  await auditService.record({ req, user, action: 'LOGIN', entityType: 'User', entityId: user._id });

  const token = signToken(user);

  let customer = null;
  let account = null;
  if (user.role === ROLES.CUSTOMER) {
    customer = await Customer.findOne({ user: user._id });
    if (customer) account = await Account.findOne({ customer: customer._id });
  }

  return { token, user: sanitizeUser(user), customer, account };
}

async function logout({ token, req, user }) {
  let expiresAt = new Date(Date.now() + 60 * 60 * 1000); // safe fallback
  try {
    const payload = verifyToken(token);
    if (payload.exp) expiresAt = new Date(payload.exp * 1000);
  } catch (err) {
    // token already invalid/expired - nothing to revoke, but treat as successful logout
  }
  await RevokedToken.updateOne({ token }, { token, expiresAt }, { upsert: true });
  await auditService.record({ req, user, action: 'LOGOUT', entityType: 'User', entityId: user?._id });
}

function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
  };
}

module.exports = { register, login, logout, sanitizeUser };
