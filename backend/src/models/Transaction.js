const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const {
  TRANSACTION_TYPE,
  TRANSACTION_STATUS,
  CURRENCY,
  RISK_LEVEL,
} = require('../utils/constants');

const counterpartySchema = new mongoose.Schema(
  {
    accountNumber: { type: String },
    name: { type: String },
  },
  { _id: false }
);

const riskBreakdownSchema = new mongoose.Schema(
  {
    amountRisk: { type: Number, default: 0 },
    frequencyRisk: { type: Number, default: 0 },
    locationRisk: { type: Number, default: 0 },
    customerRisk: { type: Number, default: 0 },
  },
  { _id: false }
);

const transactionSchema = new mongoose.Schema(
  {
    transactionRef: { type: String, required: true, unique: true, default: uuidv4 },
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    type: { type: String, enum: Object.values(TRANSACTION_TYPE), required: true },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, enum: Object.values(CURRENCY), default: CURRENCY.INR },
    timestamp: { type: Date, required: true, default: Date.now },
    location: { type: String, required: true, default: 'Bengaluru, IN' },
    description: { type: String, default: '' },
    counterparty: { type: counterpartySchema, default: undefined },
    // Destination account for TRANSFER (internal accounts only).
    destinationAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', default: null },
    status: {
      type: String,
      enum: Object.values(TRANSACTION_STATUS),
      default: TRANSACTION_STATUS.COMPLETED,
    },
    balanceAfter: { type: Number },
    idempotencyKey: { type: String, default: null },
    // --- AML / risk fields, populated synchronously after the transaction is persisted ---
    riskScore: { type: Number, default: 0, min: 0, max: 100 },
    riskLevel: { type: String, enum: Object.values(RISK_LEVEL), default: RISK_LEVEL.LOW },
    riskBreakdown: { type: riskBreakdownSchema, default: () => ({}) },
    isSuspicious: { type: Boolean, default: false },
    triggeredRuleCodes: { type: [String], default: [] },
  },
  { timestamps: true }
);

transactionSchema.index({ account: 1, timestamp: -1 });
transactionSchema.index({ customer: 1, timestamp: -1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ timestamp: -1 });
transactionSchema.index({ riskLevel: 1 });
transactionSchema.index({ isSuspicious: 1 });
transactionSchema.index({ idempotencyKey: 1 }, { sparse: true });

module.exports = mongoose.model('Transaction', transactionSchema);
