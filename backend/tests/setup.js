const mongoose = require('mongoose');

const dbAvailable = process.env.CBA_DB_AVAILABLE === 'true';

beforeAll(async () => {
  if (dbAvailable && mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }
});

afterEach(async () => {
  if (!dbAvailable) return;
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  if (dbAvailable) {
    await mongoose.connection.close();
  }
});
