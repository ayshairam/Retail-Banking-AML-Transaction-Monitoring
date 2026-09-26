const { Account, Customer } = require('../models');
const { ROLES, ACCOUNT_STATUS } = require('../utils/constants');
const ApiError = require('../utils/ApiError');
const auditService = require('./auditService');

async function getAccountById(accountId, requestingUser) {
  const account = await Account.findById(accountId).populate('customer');
  if (!account) throw ApiError.notFound('Account not found', 'ACCOUNT_NOT_FOUND');

  const isOwner =
    requestingUser.role === ROLES.CUSTOMER && String(account.customer.user) === String(requestingUser._id);
  const isStaff = [ROLES.EMPLOYEE, ROLES.ADMIN].includes(requestingUser.role);
  if (!isOwner && !isStaff) {
    throw ApiError.forbidden('You may only view your own account', 'RESOURCE_OWNERSHIP_VIOLATION');
  }
  return account;
}

async function setFreezeStatus(accountId, { action, reason }, req) {
  const account = await Account.findById(accountId);
  if (!account) throw ApiError.notFound('Account not found', 'ACCOUNT_NOT_FOUND');

  const oldValue = { status: account.status };
  if (action === 'FREEZE') {
    if (account.status === ACCOUNT_STATUS.FROZEN) {
      throw ApiError.conflict('Account is already frozen', 'ALREADY_FROZEN');
    }
    account.status = ACCOUNT_STATUS.FROZEN;
    account.frozenAt = new Date();
    account.frozenReason = reason || 'Frozen by compliance/employee action';
  } else {
    if (account.status === ACCOUNT_STATUS.ACTIVE) {
      throw ApiError.conflict('Account is already active', 'ALREADY_ACTIVE');
    }
    account.status = ACCOUNT_STATUS.ACTIVE;
    account.frozenAt = null;
    account.frozenReason = null;
  }
  await account.save();

  await auditService.record({
    req,
    action: action === 'FREEZE' ? 'ACCOUNT_FREEZE' : 'ACCOUNT_UNFREEZE',
    entityType: 'Account',
    entityId: account._id,
    oldValue,
    newValue: { status: account.status, reason: account.frozenReason },
  });

  return account;
}

module.exports = { getAccountById, setFreezeStatus };
