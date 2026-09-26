import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CUSTOMER_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/account', label: 'My Account', icon: '💳' },
  { to: '/transactions', label: 'Transactions', icon: '📄' },
  { to: '/transactions/new', label: 'New Transaction', icon: '➕' },
];

const EMPLOYEE_LINKS = [
  { to: '/compliance/dashboard', label: 'Compliance Dashboard', icon: '📊' },
  { to: '/compliance/customers', label: 'Customers', icon: '👥' },
  { to: '/compliance/transactions', label: 'Transactions', icon: '📄' },
  { to: '/compliance/alerts', label: 'AML Alerts', icon: '🚨' },
  { to: '/compliance/accounts', label: 'Account Controls', icon: '🔒' },
];

const ADMIN_LINKS = [
  { to: '/admin/rules', label: 'AML Rule Management', icon: '⚙️' },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: '🧾' },
];

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const links = [
    ...(user?.role === 'CUSTOMER' ? CUSTOMER_LINKS : []),
    ...(user?.role === 'EMPLOYEE' || user?.role === 'ADMIN' ? EMPLOYEE_LINKS : []),
    ...(user?.role === 'ADMIN' ? ADMIN_LINKS : []),
  ];

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-slate-900 text-slate-100 shrink-0">
        <SidebarContent links={links} />
      </aside>

      {/* Sidebar - mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 h-full bg-slate-900 text-slate-100 flex flex-col">
            <SidebarContent links={links} onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="lg:hidden p-2 rounded-md hover:bg-slate-100"
              aria-label="Open navigation menu"
              onClick={() => setSidebarOpen(true)}
            >
              ☰
            </button>
            <span className="font-semibold text-slate-800 hidden sm:inline">CBA Retail Bank</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-800">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.role}</p>
            </div>
            <button type="button" className="btn-secondary btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({ links, onNavigate }) {
  return (
    <>
      <div className="h-16 flex items-center px-5 border-b border-slate-800">
        <span className="text-lg font-bold tracking-tight">CBA <span className="text-brand-400">Bank</span></span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <span aria-hidden="true">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-5 py-4 text-xs text-slate-500 border-t border-slate-800">
        AML Transaction Monitoring System
      </div>
    </>
  );
}
