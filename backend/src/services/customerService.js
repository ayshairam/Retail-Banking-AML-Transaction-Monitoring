const { Customer, Account, User } = require('../models');
const { ROLES } = require('../utils/constants');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildMeta, buildSort } = require('../utils/pagination');

async function getCustomerById(customerId, requestingUser) {
  const customer = await Customer.findById(customerId);
  if (!customer) throw ApiError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');

  const isOwner = requestingUser.role === ROLES.CUSTOMER && String(customer.user) === String(requestingUser._id);
  const isStaff = [ROLES.EMPLOYEE, ROLES.ADMIN].includes(requestingUser.role);
  if (!isOwner && !isStaff) {
    throw ApiError.forbidden('You may only view your own customer profile', 'RESOURCE_OWNERSHIP_VIOLATION');
  }

  const accounts = await Account.find({ customer: customer._id });
  return { customer, accounts };
}

async function searchCustomers(query) {
  const { page, limit, skip } = parsePagination(query);
  const sort = buildSort(query.sortBy, query.sortDir, ['name', 'createdAt', 'customerRiskLevel']);

  const filter = {};
  if (query.riskLevel) filter.customerRiskLevel = query.riskLevel;

  let accountNumberCustomerIds = null;
  if (query.q) {
    const regex = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];

    // also allow searching by account number
    const matchingAccounts = await Account.find({ accountNumber: regex }).select('customer').lean();
    if (matchingAccounts.length) {
      accountNumberCustomerIds = matchingAccounts.map((a) => a.customer);
      filter.$or.push({ _id: { $in: accountNumberCustomerIds } });
    }
  }

  const [items, total] = await Promise.all([
    Customer.find(filter).sort(sort).skip(skip).limit(limit),
    Customer.countDocuments(filter),
  ]);

  const customerIds = items.map((c) => c._id);
  const accounts = await Account.find({ customer: { $in: customerIds } }).lean();
  const accountsByCustomer = {};
  accounts.forEach((a) => {
    accountsByCustomer[a.customer] = accountsByCustomer[a.customer] || [];
    accountsByCustomer[a.customer].push(a);
  });

  const data = items.map((c) => ({
    ...c.toObject(),
    accounts: accountsByCustomer[c._id] || [],
  }));

  return { data, meta: buildMeta(page, limit, total) };
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { getCustomerById, searchCustomers };
