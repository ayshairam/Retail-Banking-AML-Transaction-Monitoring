const mongoose = require('mongoose');
const { Transaction, Account, Customer } = require('../models');
const { ROLES, ACCOUNT_STATUS, TRANSACTION_TYPE, TRANSACTION_STATUS } = require('../utils/constants');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildMeta, buildSort } = require('../utils/pagination');
const amlEngine = require('../aml/engine');
const auditService = require('./auditService');
const logger = require('../config/logger');

/**
 * Applies the balance-affecting side effect for a transaction type using an atomic,
 * conditional single-document update (findOneAndUpdate with a matching filter), so a
 * concurrent withdrawal can never push a balance negative and a frozen account can never
 * be debited/credited between the status check and the update.
 *
 * Returns the updated account, or throws a descriptive ApiError if the precondition
 * (sufficient funds / active status) was not met.
 */
async function applyBalanceChange({ accountId, type, amount, session }) {
  const opts = { new: true, session };

  if (type === TRANSACTION_TYPE.DEPOSIT) {
    const updated = await Account.findOneAndUpdate(
      { _id: accountId, status: ACCOUNT_STATUS.ACTIVE },
      { $inc: { balance: amount } },
      opts
    );
    if (!updated) throw await accountUnavailableError(accountId, session);
    return updated;
  }

  // WITHDRAWAL, PAYMENT, and the debit leg of TRANSFER all require sufficient funds.
  const updated = await Account.findOneAndUpdate(
    { _id: accountId, status: ACCOUNT_STATUS.ACTIVE, balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    opts
  );
  if (!updated) throw await accountUnavailableError(accountId, session, amount);
  return updated;
}

async function accountUnavailableError(accountId, session, amount) {
  const account = await Account.findById(accountId).session(session || null);
  if (!account) return ApiError.notFound('Account not found', 'ACCOUNT_NOT_FOUND');
  if (account.status === ACCOUNT_STATUS.FROZEN) {
    return ApiError.badRequest('This account is frozen and cannot perform transactions', 'ACCOUNT_FROZEN');
  }
  if (amount != null && account.balance < amount) {
    return ApiError.badRequest('Insufficient balance for this transaction', 'INSUFFICIENT_BALANCE');
  }
  return ApiError.badRequest('Transaction could not be completed', 'TRANSACTION_REJECTED');
}

async function creditAccount(accountId, amount, session) {
  const updated = await Account.findOneAndUpdate(
    { _id: accountId, status: ACCOUNT_STATUS.ACTIVE },
    { $inc: { balance: amount } },
    { new: true, session }
  );
  return updated;
}

/**
 * Attempts to run the balance updates + transaction insert inside a real MongoDB
 * multi-document transaction (requires the server to be a replica set / mongos). If the
 * server does not support transactions (e.g. a bare standalone `mongod`), falls back to the
 * same conditional atomic single-document updates executed sequentially with a compensating
 * rollback for the (rare) case where a TRANSFER's credit leg fails after the debit succeeded.
 */
async function withOptionalTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    let usedTransaction = true;
    try {
      await session.withTransaction(async () => {
        result = await work(session);
      });
    } catch (err) {
      if (isTransactionsUnsupported(err)) {
        usedTransaction = false;
      } else {
        throw err;
      }
    }
    if (!usedTransaction) {
      logger.warn('MongoDB transactions unsupported on this deployment (standalone mongod?) - falling back to sequential atomic updates with compensation.');
      result = await work(null);
    }
    return result;
  } finally {
    await session.endSession();
  }
}

function isTransactionsUnsupported(err) {
  const msg = String(err?.message || '');
  return (
    msg.includes('Transaction numbers are only allowed') ||
    msg.includes('IllegalOperation') ||
    (err?.code === 20 && msg.includes('transaction'))
  );
}

async function createTransaction(input, actingUser, req) {
  const account = await Account.findById(input.accountId).populate('customer');
  if (!account) throw ApiError.notFound('Account not found', 'ACCOUNT_NOT_FOUND');

  const isOwner =
    actingUser.role === ROLES.CUSTOMER && String(account.customer.user) === String(actingUser._id);
  const isAdmin = actingUser.role === ROLES.ADMIN;
  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden('You may only transact on your own account', 'RESOURCE_OWNERSHIP_VIOLATION');
  }

  // Duplicate transaction prevention via client-supplied idempotency key.
  if (input.idempotencyKey) {
    const existing = await Transaction.findOne({ idempotencyKey: input.idempotencyKey });
    if (existing) return { transaction: existing, alert: null, duplicate: true };
  }

  let destinationAccount = null;
  if (input.type === TRANSACTION_TYPE.TRANSFER) {
    destinationAccount = await Account.findOne({ accountNumber: input.destinationAccountNumber }).populate(
      'customer'
    );
    if (!destinationAccount) {
      throw ApiError.badRequest('Destination account not found', 'DESTINATION_ACCOUNT_NOT_FOUND');
    }
    if (String(destinationAccount._id) === String(account._id)) {
      throw ApiError.badRequest('Cannot transfer to the same account', 'INVALID_TRANSFER');
    }
  }

  const timestamp = new Date();

  const { savedTransaction, updatedAccount } = await withOptionalTransaction(async (session) => {
    const debited = await applyBalanceChange({
      accountId: account._id,
      type: input.type,
      amount: input.amount,
      session,
    });

    let destBalanceAfter;
    if (input.type === TRANSACTION_TYPE.TRANSFER) {
      const credited = await creditAccount(destinationAccount._id, input.amount, session);
      if (!credited) {
        // Compensate: reverse the debit since the credit leg failed.
        await Account.findOneAndUpdate(
          { _id: account._id },
          { $inc: { balance: input.amount } },
          { session }
        );
        throw ApiError.badRequest(
          'Destination account is frozen and cannot receive transfers',
          'DESTINATION_ACCOUNT_FROZEN'
        );
      }
      destBalanceAfter = credited.balance;
    }

    const [txDoc] = await Transaction.create(
      [
        {
          account: account._id,
          customer: account.customer._id,
          type: input.type,
          amount: input.amount,
          currency: input.currency || 'INR',
          timestamp,
          location: input.location || 'Bengaluru, IN',
          description: input.description || '',
          counterparty:
            input.type === TRANSACTION_TYPE.TRANSFER
              ? { accountNumber: destinationAccount.accountNumber, name: destinationAccount.customer.name }
              : input.counterpartyName
              ? { name: input.counterpartyName }
              : undefined,
          destinationAccount: destinationAccount ? destinationAccount._id : null,
          status: TRANSACTION_STATUS.COMPLETED,
          balanceAfter: debited.balance,
          idempotencyKey: input.idempotencyKey || null,
        },
      ],
      { session }
    );

    return { savedTransaction: txDoc, updatedAccount: debited };
  });

  // Track this location as "known" for the customer for future location-risk scoring.
  await Customer.updateOne(
    { _id: account.customer._id },
    { $addToSet: { knownLocations: savedTransaction.location } }
  );

  // --- AML evaluation runs synchronously right after persistence ---
  let alert = null;
  try {
    const evalResult = await amlEngine.evaluateTransaction(savedTransaction, {
      customer: account.customer,
      account: updatedAccount,
    });
    savedTransaction.riskScore = evalResult.riskScore;
    savedTransaction.riskLevel = evalResult.riskLevel;
    savedTransaction.riskBreakdown = evalResult.breakdown;
    savedTransaction.isSuspicious = evalResult.isSuspicious;
    savedTransaction.triggeredRuleCodes = evalResult.triggeredRuleCodes;
    await savedTransaction.save();
    alert = evalResult.alert;
  } catch (err) {
    logger.error('AML engine evaluation failed for transaction', {
      transactionId: savedTransaction._id.toString(),
      message: err.message,
    });
  }

  await auditService.record({
    req,
    user: actingUser,
    action: 'TRANSACTION_CREATE',
    entityType: 'Transaction',
    entityId: savedTransaction._id,
    newValue: {
      type: savedTransaction.type,
      amount: savedTransaction.amount,
      account: String(account._id),
      isSuspicious: savedTransaction.isSuspicious,
    },
  });

  return { transaction: savedTransaction, alert, duplicate: false };
}

async function getTransactionsForAccount(accountId, query, requestingUser) {
  const account = await Account.findById(accountId).populate('customer');
  if (!account) throw ApiError.notFound('Account not found', 'ACCOUNT_NOT_FOUND');

  const isOwner =
    requestingUser.role === ROLES.CUSTOMER && String(account.customer.user) === String(requestingUser._id);
  const isStaff = [ROLES.EMPLOYEE, ROLES.ADMIN].includes(requestingUser.role);
  if (!isOwner && !isStaff) {
    throw ApiError.forbidden('You may only view your own transactions', 'RESOURCE_OWNERSHIP_VIOLATION');
  }

  const { page, limit, skip } = parsePagination(query);
  const sort = buildSort(query.sortBy, query.sortDir, ['timestamp', 'amount', 'riskScore', 'createdAt'], 'timestamp');

  // Includes transfers where this account was the recipient, so a customer's statement
  // reflects money in as well as money out without duplicating documents.
  const filter = { $or: [{ account: account._id }, { destinationAccount: account._id }] };
  if (query.type) filter.type = query.type;
  if (query.status) filter.status = query.status;
  if (query.riskLevel) filter.riskLevel = query.riskLevel;
  if (query.isSuspicious === 'true') filter.isSuspicious = true;
  if (query.isSuspicious === 'false') filter.isSuspicious = false;
  if (query.minAmount || query.maxAmount) {
    filter.amount = {};
    if (query.minAmount) filter.amount.$gte = Number(query.minAmount);
    if (query.maxAmount) filter.amount.$lte = Number(query.maxAmount);
  }
  if (query.startDate || query.endDate) {
    filter.timestamp = {};
    if (query.startDate) filter.timestamp.$gte = new Date(query.startDate);
    if (query.endDate) filter.timestamp.$lte = new Date(query.endDate);
  }

  const [items, total] = await Promise.all([
    Transaction.find(filter).sort(sort).skip(skip).limit(limit),
    Transaction.countDocuments(filter),
  ]);

  return { data: items, meta: buildMeta(page, limit, total), account };
}

async function searchTransactions(query) {
  const { page, limit, skip } = parsePagination(query);
  const sort = buildSort(query.sortBy, query.sortDir, ['timestamp', 'amount', 'riskScore', 'createdAt'], 'timestamp');

  const filter = {};
  if (query.transactionId) filter.transactionRef = query.transactionId;
  if (query.accountId) filter.account = query.accountId;
  if (query.customerId) filter.customer = query.customerId;
  if (query.type) filter.type = query.type;
  if (query.status) filter.status = query.status;
  if (query.riskLevel) filter.riskLevel = query.riskLevel;
  if (query.isSuspicious === 'true') filter.isSuspicious = true;
  if (query.isSuspicious === 'false') filter.isSuspicious = false;
  if (query.minAmount || query.maxAmount) {
    filter.amount = {};
    if (query.minAmount) filter.amount.$gte = Number(query.minAmount);
    if (query.maxAmount) filter.amount.$lte = Number(query.maxAmount);
  }
  if (query.startDate || query.endDate) {
    filter.timestamp = {};
    if (query.startDate) filter.timestamp.$gte = new Date(query.startDate);
    if (query.endDate) filter.timestamp.$lte = new Date(query.endDate);
  }

  const [items, total] = await Promise.all([
    Transaction.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('customer', 'name email phone')
      .populate('account', 'accountNumber'),
    Transaction.countDocuments(filter),
  ]);

  return { data: items, meta: buildMeta(page, limit, total) };
}

module.exports = { createTransaction, getTransactionsForAccount, searchTransactions };
