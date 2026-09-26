const mongoose = require('mongoose');

// Configurable location risk table used by the Location Risk scoring component.
// Admins/employees are not required to hard-code any real-world jurisdiction as risky - this
// collection is seeded with example/fictional-style entries and can be edited without
// touching application code.
const locationRiskSchema = new mongoose.Schema(
  {
    location: { type: String, required: true, unique: true, trim: true },
    isHighRisk: { type: Boolean, default: false },
    riskScore: { type: Number, required: true, min: 0, max: 20 }, // contributes directly to the 0-20 Location Risk band
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LocationRisk', locationRiskSchema);
