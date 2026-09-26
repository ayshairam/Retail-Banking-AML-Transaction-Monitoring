const { Account } = require('../models');

function randomDigits(len) {
  let out = '';
  for (let i = 0; i < len; i += 1) {
    out += Math.floor(Math.random() * 10);
  }
  return out;
}

/** Generates a unique-looking account number, retrying on the rare collision. */
async function generateAccountNumber() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `CBA${randomDigits(4)}${randomDigits(6)}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await Account.exists({ accountNumber: candidate });
    if (!exists) return candidate;
  }
  throw new Error('Failed to generate a unique account number, please retry');
}

module.exports = generateAccountNumber;
