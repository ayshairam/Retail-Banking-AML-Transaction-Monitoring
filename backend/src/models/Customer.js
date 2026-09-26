const mongoose = require('mongoose');
const { RISK_LEVEL } = require('../utils/constants');

// A Customer is the business profile for a User with role CUSTOMER. Kept separate from
// User so employees/admins (who have no customer profile) don't carry these fields, and so
// bank-facing customer data (risk level, denormalized contact info for search) lives in one
// place with its own indexes.
const customerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    customerRiskLevel: {
      // Configured baseline risk level for this customer (factor in Customer Risk scoring).
      type: String,
      enum: Object.values(RISK_LEVEL),
      default: RISK_LEVEL.LOW,
    },
    knownLocations: { type: [String], default: [] }, // locations this customer has transacted from before
  },
  { timestamps: true }
);

customerSchema.index({ name: 'text', email: 'text', phone: 'text' });
customerSchema.index({ email: 1 });
customerSchema.index({ phone: 1 });
customerSchema.index({ createdAt: 1 });

module.exports = mongoose.model('Customer', customerSchema);
