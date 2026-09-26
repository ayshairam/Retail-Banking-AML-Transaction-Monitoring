import api from './api';

export async function createTransaction(payload) {
  const res = await api.post('/transactions', payload);
  return res.data.data;
}

export async function getAccountTransactions(accountId, params = {}) {
  const res = await api.get(`/transactions/${accountId}`, { params });
  return { data: res.data.data, meta: res.data.meta };
}

export async function searchTransactions(params = {}) {
  const res = await api.get('/transactions/search', { params });
  return { data: res.data.data, meta: res.data.meta };
}

export async function downloadStatement(accountId, { startDate, endDate, format = 'pdf' }) {
  const res = await api.get(`/transactions/statement/${accountId}`, {
    params: { startDate, endDate, format },
    responseType: 'blob',
  });
  return res.data;
}
