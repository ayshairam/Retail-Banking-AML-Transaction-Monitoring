import api from './api';

export async function getAccount(id) {
  const res = await api.get(`/accounts/${id}`);
  return res.data.data;
}

export async function freezeAccount(id, reason) {
  const res = await api.put(`/accounts/${id}/freeze`, { reason });
  return res.data.data;
}

export async function unfreezeAccount(id, reason) {
  const res = await api.put(`/accounts/${id}/unfreeze`, { reason });
  return res.data.data;
}
