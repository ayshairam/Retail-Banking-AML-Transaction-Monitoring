import api from './api';

export async function getCustomer(id) {
  const res = await api.get(`/customers/${id}`);
  return res.data.data;
}

export async function searchCustomers(params = {}) {
  const res = await api.get('/customers/search', { params });
  return { data: res.data.data, meta: res.data.meta };
}
