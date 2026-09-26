import React, { createContext, useContext, useEffect, useState } from 'react';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('cba_user');
    const storedCustomer = localStorage.getItem('cba_customer');
    const storedAccount = localStorage.getItem('cba_account');
    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedCustomer) setCustomer(JSON.parse(storedCustomer));
    if (storedAccount) setAccount(JSON.parse(storedAccount));
    setLoading(false);
  }, []);

  function persistSession({ token, user: u, customer: c, account: a }) {
    localStorage.setItem('cba_token', token);
    localStorage.setItem('cba_user', JSON.stringify(u));
    if (c) localStorage.setItem('cba_customer', JSON.stringify(c));
    if (a) localStorage.setItem('cba_account', JSON.stringify(a));
    setUser(u);
    setCustomer(c || null);
    setAccount(a || null);
  }

  async function login(payload) {
    const result = await authService.login(payload);
    persistSession(result);
    return result;
  }

  async function register(payload) {
    const result = await authService.register(payload);
    persistSession(result);
    return result;
  }

  async function logout() {
    await authService.logout();
    localStorage.removeItem('cba_token');
    localStorage.removeItem('cba_user');
    localStorage.removeItem('cba_customer');
    localStorage.removeItem('cba_account');
    setUser(null);
    setCustomer(null);
    setAccount(null);
  }

  const value = { user, customer, account, loading, login, register, logout, setAccount };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
