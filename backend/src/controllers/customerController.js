const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const customerService = require('../services/customerService');

const getCustomerHandler = asyncHandler(async (req, res) => {
  const result = await customerService.getCustomerById(req.params.id, req.user);
  return success(res, 200, 'Customer retrieved', result);
});

const searchCustomersHandler = asyncHandler(async (req, res) => {
  const { data, meta } = await customerService.searchCustomers(req.query);
  return success(res, 200, 'Customers retrieved', data, meta);
});

module.exports = { getCustomerHandler, searchCustomersHandler };
