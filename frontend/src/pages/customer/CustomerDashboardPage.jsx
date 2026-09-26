import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as dashboardService from '../../services/dashboardService';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/format';
import StatCard from '../../components/StatCard';
import TransactionTable from '../../components/TransactionTable';
import { LoadingState, EmptyState, ErrorState } from '../../components/LoadingState';
import { unwrapError } from '../../services/api';

export default function CustomerDashboardPage() {
  const { user, setAccount } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    dashboardService
      .getCustomerDashboard()
      .then((res) => {
        if (!mounted) return;
        setData(res);
        setAccount(res.account);
        localStorage.setItem('cba_account', JSON.stringify(res.account));
      })
      .catch((err) => setError(unwrapError(err)))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <LoadingState label="Loading your dashboard..." />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-sm text-slate-500">Here is a snapshot of your account.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Available Balance" value={formatCurrency(data.account.balance, data.account.currency)} icon="💰" />
        <StatCard label="Account Number" value={data.account.accountNumber} icon="🔢" />
        <StatCard
          label="Account Status"
          value={data.account.status}
          tone={data.account.status === 'FROZEN' ? 'danger' : 'success'}
          icon={data.account.status === 'FROZEN' ? '🔒' : '✅'}
        />
        <StatCard label="Recent Activity" value={`${data.recentTransactions.length} transactions`} icon="📄" />
      </div>

      {data.account.status === 'FROZEN' && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 text-sky-800 px-4 py-3 text-sm">
          Your account is currently frozen. New transactions cannot be processed until it is unfrozen by our
          compliance team.
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">Recent Transactions</h2>
          <Link to="/transactions" className="text-sm text-brand-600 hover:underline font-medium">
            View all
          </Link>
        </div>
        {data.recentTransactions.length === 0 ? (
          <EmptyState title="No transactions yet" description="Your recent transactions will appear here." />
        ) : (
          <TransactionTable transactions={data.recentTransactions} />
        )}
      </div>
    </div>
  );
}
