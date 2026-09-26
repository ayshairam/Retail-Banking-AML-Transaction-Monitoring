const { Customer, Transaction, AmlAlert, Account } = require('../models');
const { ACCOUNT_STATUS, ALERT_STATUS } = require('../utils/constants');

/**
 * All figures are computed live from persisted collections (no cached/hard-coded numbers),
 * so the dashboard always reconciles with the underlying data.
 */
async function getComplianceStats() {
  const [
    totalCustomers,
    totalTransactions,
    suspiciousTransactions,
    highRiskCustomers,
    frozenAccounts,
    openAlerts,
    dailyVolume,
    typeDistribution,
    riskDistribution,
    alertTrend,
    recentSuspicious,
  ] = await Promise.all([
    Customer.countDocuments({}),
    Transaction.countDocuments({}),
    Transaction.countDocuments({ isSuspicious: true }),
    Customer.countDocuments({ customerRiskLevel: { $in: ['HIGH', 'CRITICAL'] } }),
    Account.countDocuments({ status: ACCOUNT_STATUS.FROZEN }),
    AmlAlert.countDocuments({ status: { $in: [ALERT_STATUS.OPEN, ALERT_STATUS.UNDER_REVIEW] } }),
    Transaction.aggregate([
      { $match: { timestamp: { $gte: daysAgo(30) } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Transaction.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
    Transaction.aggregate([{ $group: { _id: '$riskLevel', count: { $sum: 1 } } }]),
    AmlAlert.aggregate([
      { $match: { createdAt: { $gte: daysAgo(30) } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Transaction.find({ isSuspicious: true })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('customer', 'name email')
      .populate('account', 'accountNumber'),
  ]);

  return {
    totals: {
      totalCustomers,
      totalTransactions,
      suspiciousTransactions,
      highRiskCustomers,
      frozenAccounts,
      openAlerts,
    },
    charts: {
      dailyTransactionVolume: dailyVolume.map((d) => ({ date: d._id, totalAmount: d.totalAmount, count: d.count })),
      transactionTypeDistribution: typeDistribution.map((d) => ({ type: d._id, count: d.count })),
      riskLevelDistribution: riskDistribution.map((d) => ({ riskLevel: d._id, count: d.count })),
      alertTrend: alertTrend.map((d) => ({ date: d._id, count: d.count })),
    },
    recentSuspiciousTransactions: recentSuspicious,
  };
}

async function getCustomerDashboard(customer, account) {
  const recentTransactions = await Transaction.find({
    $or: [{ account: account._id }, { destinationAccount: account._id }],
  })
    .sort({ timestamp: -1 })
    .limit(10);

  return {
    customer: { id: customer._id, name: customer.name, email: customer.email, phone: customer.phone },
    account: {
      id: account._id,
      accountNumber: account.accountNumber,
      balance: account.balance,
      currency: account.currency,
      status: account.status,
    },
    recentTransactions,
  };
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

module.exports = { getComplianceStats, getCustomerDashboard };
