import api from './api';

export async function listAlerts(params = {}) {
  const res = await api.get('/aml/alerts', { params });
  return { data: res.data.data, meta: res.data.meta };
}

export async function getAlert(id) {
  const res = await api.get(`/aml/alerts/${id}`);
  return res.data.data;
}

export async function reviewAlert(id, payload) {
  const res = await api.put(`/aml/alerts/${id}/review`, payload);
  return res.data.data;
}

export async function listRules() {
  const res = await api.get('/aml/rules');
  return res.data.data;
}

export async function updateRule(id, payload) {
  const res = await api.put(`/aml/rules/${id}`, payload);
  return res.data.data;
}

export async function toggleRule(id, enabled) {
  const res = await api.put(`/aml/rules/${id}/toggle`, { enabled });
  return res.data.data;
}
