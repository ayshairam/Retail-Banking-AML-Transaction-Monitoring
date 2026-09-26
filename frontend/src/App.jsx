import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';
import NotFoundPage from './pages/public/NotFoundPage';
import ForbiddenPage from './pages/public/ForbiddenPage';

import CustomerDashboardPage from './pages/customer/CustomerDashboardPage';
import AccountPage from './pages/customer/AccountPage';
import TransactionsPage from './pages/customer/TransactionsPage';
import TransactionDetailPage from './pages/customer/TransactionDetailPage';
import NewTransactionPage from './pages/customer/NewTransactionPage';

import ComplianceDashboardPage from './pages/employee/ComplianceDashboardPage';
import CustomerSearchPage from './pages/employee/CustomerSearchPage';
import CustomerDetailPage from './pages/employee/CustomerDetailPage';
import TransactionSearchPage from './pages/employee/TransactionSearchPage';
import EmployeeTransactionDetailPage from './pages/employee/TransactionDetailPage';
import AlertsPage from './pages/employee/AlertsPage';
import AlertDetailPage from './pages/employee/AlertDetailPage';
import AccountControlsPage from './pages/employee/AccountControlsPage';

import RuleManagementPage from './pages/admin/RuleManagementPage';
import AuditLogsPage from './pages/admin/AuditLogsPage';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'CUSTOMER') return <Navigate to="/dashboard" replace />;
  return <Navigate to="/compliance/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />

      {/* Customer */}
      <Route path="/dashboard" element={<ProtectedRoute roles={['CUSTOMER']}><CustomerDashboardPage /></ProtectedRoute>} />
      <Route path="/account" element={<ProtectedRoute roles={['CUSTOMER']}><AccountPage /></ProtectedRoute>} />
      <Route path="/transactions" element={<ProtectedRoute roles={['CUSTOMER']}><TransactionsPage /></ProtectedRoute>} />
      <Route path="/transactions/new" element={<ProtectedRoute roles={['CUSTOMER']}><NewTransactionPage /></ProtectedRoute>} />
      <Route path="/transactions/:id" element={<ProtectedRoute roles={['CUSTOMER']}><TransactionDetailPage /></ProtectedRoute>} />

      {/* Employee / Admin */}
      <Route path="/compliance/dashboard" element={<ProtectedRoute roles={['EMPLOYEE', 'ADMIN']}><ComplianceDashboardPage /></ProtectedRoute>} />
      <Route path="/compliance/customers" element={<ProtectedRoute roles={['EMPLOYEE', 'ADMIN']}><CustomerSearchPage /></ProtectedRoute>} />
      <Route path="/compliance/customers/:id" element={<ProtectedRoute roles={['EMPLOYEE', 'ADMIN']}><CustomerDetailPage /></ProtectedRoute>} />
      <Route path="/compliance/transactions" element={<ProtectedRoute roles={['EMPLOYEE', 'ADMIN']}><TransactionSearchPage /></ProtectedRoute>} />
      <Route path="/compliance/transactions/:id" element={<ProtectedRoute roles={['EMPLOYEE', 'ADMIN']}><EmployeeTransactionDetailPage /></ProtectedRoute>} />
      <Route path="/compliance/alerts" element={<ProtectedRoute roles={['EMPLOYEE', 'ADMIN']}><AlertsPage /></ProtectedRoute>} />
      <Route path="/compliance/alerts/:id" element={<ProtectedRoute roles={['EMPLOYEE', 'ADMIN']}><AlertDetailPage /></ProtectedRoute>} />
      <Route path="/compliance/accounts" element={<ProtectedRoute roles={['EMPLOYEE', 'ADMIN']}><AccountControlsPage /></ProtectedRoute>} />

      {/* Admin only */}
      <Route path="/admin/rules" element={<ProtectedRoute roles={['ADMIN']}><RuleManagementPage /></ProtectedRoute>} />
      <Route path="/admin/audit-logs" element={<ProtectedRoute roles={['ADMIN']}><AuditLogsPage /></ProtectedRoute>} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
