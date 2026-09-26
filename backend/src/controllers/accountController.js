const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const accountService = require('../services/accountService');

const getAccountHandler = asyncHandler(async (req, res) => {
  const account = await accountService.getAccountById(req.params.id, req.user);
  return success(res, 200, 'Account retrieved', account);
});

function makeFreezeHandler(action) {
  return asyncHandler(async (req, res) => {
    const account = await accountService.setFreezeStatus(req.params.id, { action, reason: req.body.reason }, req);
    return success(res, 200, action === 'FREEZE' ? 'Account frozen' : 'Account unfrozen', account);
  });
}

module.exports = {
  getAccountHandler,
  freezeAccountHandler: makeFreezeHandler('FREEZE'),
  unfreezeAccountHandler: makeFreezeHandler('UNFREEZE'),
};
