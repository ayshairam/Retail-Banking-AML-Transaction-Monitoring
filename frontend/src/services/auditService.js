import api from './api';

export async function listAuditLogs(params = {}) {
  const res = await api.get('/audit-logs', { params });
  return { data: res.data.data, meta: res.data.meta };
}
