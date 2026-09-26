import api from './api';

export async function getComplianceStats() {
  const res = await api.get('/dashboard/stats');
  return res.data.data;
}

export async function getCustomerDashboard() {
  const res = await api.get('/dashboard/me');
  return res.data.data;
}
