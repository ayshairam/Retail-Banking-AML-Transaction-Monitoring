const mongoose = require('mongoose');

// Tracks tokens invalidated via logout before their natural expiry so `authenticate`
// middleware can reject them even though JWTs are otherwise stateless.
const revokedTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
});

// TTL index: MongoDB automatically purges the document once expiresAt passes.
revokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RevokedToken', revokedTokenSchema);
