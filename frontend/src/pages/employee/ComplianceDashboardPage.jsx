import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import * as dashboardService from '../../services/dashboardService';
import StatCard from '../../components/StatCard';
import TransactionTable from '../../components/TransactionTable';
import { LoadingState, ErrorState, EmptyState } from '../../components/LoadingState';
import { unwrapError } from '../../services/api';

const RISK_COLORS = { LOW: '#10b981', MEDIUM: '#f59e0b', HIGH: '#f97316', CRITICAL: '#e11d48' };
const TYPE_COLORS = ['#3562f5', '#8bb1ff', '#1c318a', '#5c8bff'];

export default function ComplianceDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService
      .getComplianceStats()
      .then(setData)
      .catch((err) => setError(unwrapError(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState label="Loading compliance dashboard..." />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const { totals, charts, recentSuspiciousTransactions } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Compliance Dashboard</h1>
        <p className="text-sm text-slate-500">Live figures computed from persisted transaction and alert data.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard label="Total Customers" value={totals.totalCustomers} icon="👥" />
        <StatCard label="Total Transactions" value={totals.totalTransactions} icon="📄" />
        <StatCard label="Suspicious Txns" value={totals.suspiciousTransactions} tone="danger" icon="🚨" />
        <StatCard label="High Risk Customers" value={totals.highRiskCustomers} tone="warning" icon="⚠️" />
        <StatCard label="Frozen Accounts" value={totals.frozenAccounts} tone="warning" icon="🔒" />
        <StatCard label="Open Alerts" value={totals.openAlerts} tone="danger" icon="🔔" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Daily Transaction Volume (30 days)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={charts.dailyTransactionVolume}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="totalAmount" stroke="#3562f5" strokeWidth={2} dot={false} name="Amount (INR)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-4">AML Alert Trend (30 days)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={charts.alertTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#e11d48" strokeWidth={2} dot={false} name="Alerts" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Transaction Type Distribution</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={charts.transactionTypeDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="type" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {charts.transactionTypeDistribution.map((entry, i) => (
                  <Cell key={entry.type} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Risk Level Distribution</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={charts.riskLevelDistribution} dataKey="count" nameKey="riskLevel" outerRadius={90} label>
                {charts.riskLevelDistribution.map((entry) => (
                  <Cell key={entry.riskLevel} fill={RISK_COLORS[entry.riskLevel] || '#94a3b8'} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800">Recent Suspicious Transactions</h2>
        </div>
        {recentSuspiciousTransactions.length === 0 ? (
          <EmptyState title="No suspicious transactions" description="Nothing has been flagged recently." />
        ) : (
          <TransactionTable transactions={recentSuspiciousTransactions} showCustomer detailBasePath="/compliance/transactions" />
        )}
      </div>
    </div>
  );
}
