import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDate } from '../utils/format';
import StatusBadge from './StatusBadge';
import RiskBadge from './RiskBadge';

export default function TransactionTable({ transactions, showCustomer = false, showRisk = true, detailBasePath = '/transactions' }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-2 text-left font-semibold text-slate-600">Date</th>
            {showCustomer && <th className="px-4 py-2 text-left font-semibold text-slate-600">Customer</th>}
            <th className="px-4 py-2 text-left font-semibold text-slate-600">Type</th>
            <th className="px-4 py-2 text-right font-semibold text-slate-600">Amount</th>
            <th className="px-4 py-2 text-left font-semibold text-slate-600">Location</th>
            <th className="px-4 py-2 text-left font-semibold text-slate-600">Status</th>
            {showRisk && <th className="px-4 py-2 text-left font-semibold text-slate-600">Risk</th>}
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {transactions.map((tx) => (
            <tr key={tx._id} className="hover:bg-slate-50">
              <td className="px-4 py-2 whitespace-nowrap text-slate-500">{formatDate(tx.timestamp)}</td>
              {showCustomer && <td className="px-4 py-2 whitespace-nowrap">{tx.customer?.name || '-'}</td>}
              <td className="px-4 py-2 whitespace-nowrap font-medium text-slate-700">{tx.type}</td>
              <td className="px-4 py-2 whitespace-nowrap text-right font-mono">{formatCurrency(tx.amount, tx.currency)}</td>
              <td className="px-4 py-2 whitespace-nowrap text-slate-500">{tx.location}</td>
              <td className="px-4 py-2 whitespace-nowrap">
                <StatusBadge status={tx.status} />
                {tx.isSuspicious && <span className="badge bg-rose-100 text-rose-800 ml-1">Flagged</span>}
              </td>
              {showRisk && (
                <td className="px-4 py-2 whitespace-nowrap">
                  <RiskBadge level={tx.riskLevel} />
                </td>
              )}
              <td className="px-4 py-2 whitespace-nowrap text-right">
                <Link to={`${detailBasePath}/${tx._id}`} state={{ transaction: tx }} className="text-brand-600 hover:underline text-xs font-medium">
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
