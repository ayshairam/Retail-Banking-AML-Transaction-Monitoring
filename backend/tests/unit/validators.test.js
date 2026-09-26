const { registerSchema, loginSchema } = require('../../src/validators/authValidators');
const { createTransactionSchema } = require('../../src/validators/transactionValidators');

describe('registerSchema', () => {
  const valid = { name: 'Jane Doe', email: 'jane@example.com', phone: '+919900001234', password: 'Str0ng!Pass' };

  test('accepts a fully valid registration payload', () => {
    const { error } = registerSchema.validate(valid);
    expect(error).toBeUndefined();
  });

  test.each([
    ['missing name', { ...valid, name: undefined }],
    ['missing email', { ...valid, email: undefined }],
    ['missing phone', { ...valid, phone: undefined }],
    ['missing password', { ...valid, password: undefined }],
  ])('rejects %s', (_label, payload) => {
    const { error } = registerSchema.validate(payload);
    expect(error).toBeDefined();
  });

  test('rejects an invalid email', () => {
    const { error } = registerSchema.validate({ ...valid, email: 'not-an-email' });
    expect(error).toBeDefined();
  });

  test('rejects an invalid phone number', () => {
    const { error } = registerSchema.validate({ ...valid, phone: 'abc123' });
    expect(error).toBeDefined();
  });

  test.each([
    ['too short', 'Sh0rt!'],
    ['no uppercase', 'weak1234!'],
    ['no lowercase', 'WEAK1234!'],
    ['no digit', 'WeakPassword!'],
    ['no special char', 'WeakPassword1'],
  ])('rejects a weak password (%s)', (_label, password) => {
    const { error } = registerSchema.validate({ ...valid, password });
    expect(error).toBeDefined();
  });
});

describe('loginSchema', () => {
  test('requires email and password', () => {
    expect(loginSchema.validate({}).error).toBeDefined();
    expect(loginSchema.validate({ email: 'a@b.com', password: 'x' }).error).toBeUndefined();
  });
});

describe('createTransactionSchema', () => {
  const validAccountId = '507f1f77bcf86cd799439011';

  test('accepts a valid deposit', () => {
    const { error } = createTransactionSchema.validate({
      accountId: validAccountId,
      type: 'DEPOSIT',
      amount: 1000,
    });
    expect(error).toBeUndefined();
  });

  test('rejects a zero or negative amount', () => {
    expect(
      createTransactionSchema.validate({ accountId: validAccountId, type: 'DEPOSIT', amount: 0 }).error
    ).toBeDefined();
    expect(
      createTransactionSchema.validate({ accountId: validAccountId, type: 'DEPOSIT', amount: -50 }).error
    ).toBeDefined();
  });

  test('rejects an invalid transaction type', () => {
    const { error } = createTransactionSchema.validate({
      accountId: validAccountId,
      type: 'BOGUS',
      amount: 100,
    });
    expect(error).toBeDefined();
  });

  test('requires a destinationAccountNumber for TRANSFER', () => {
    const { error } = createTransactionSchema.validate({
      accountId: validAccountId,
      type: 'TRANSFER',
      amount: 100,
    });
    expect(error).toBeDefined();
  });

  test('accepts a TRANSFER with a destination account number', () => {
    const { error } = createTransactionSchema.validate({
      accountId: validAccountId,
      type: 'TRANSFER',
      amount: 100,
      destinationAccountNumber: 'CBA12345678',
    });
    expect(error).toBeUndefined();
  });

  test('rejects a malformed accountId', () => {
    const { error } = createTransactionSchema.validate({
      accountId: 'not-an-object-id',
      type: 'DEPOSIT',
      amount: 100,
    });
    expect(error).toBeDefined();
  });
});
