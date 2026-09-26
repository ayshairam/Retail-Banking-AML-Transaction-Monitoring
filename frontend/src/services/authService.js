import api from './api';

export async function register(payload) {
  const res = await api.post('/auth/register', payload);
  return res.data.data;
}

export async function login(payload) {
  const res = await api.post('/auth/login', payload);
  return res.data.data;
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch (err) {
    // ignore - we clear local state regardless
  }
}

export async function fetchMe() {
  const res = await api.get('/auth/me');
  return res.data.data;
}
