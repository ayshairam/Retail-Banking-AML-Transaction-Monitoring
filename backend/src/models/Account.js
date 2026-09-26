const mongoose = require('mongoose');
const { ACCOUNT_STATUS, CURRENCY } = require('../utils/constants');

const accountSchema = new mongoose.Schema(
  {
    accountNumber: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    balance: { type: Number, required: true, default: 0, min: 0 },
    currency: { type: String, enum: Object.values(CURRENCY), default: CURRENCY.INR },
    status: {
      type: String,
      enum: Object.values(ACCOUNT_STATUS),
      default: ACCOUNT_STATUS.ACTIVE,
    },
    frozenAt: { type: Date, default: null },
    frozenReason: { type: String, default: null },
  },
  { timestamps: true }
);

accountSchema.index({ customer: 1 });
accountSchema.index({ status: 1 });

module.exports = mongoose.model('Account', accountSchema);
