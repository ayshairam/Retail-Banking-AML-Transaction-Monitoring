import React, { useEffect, useState } from 'react';
import * as auditService from '../../services/auditService';
import { LoadingState, EmptyState, ErrorState } from '../../components/LoadingState';
import Pagination from '../../components/Pagination';
import { formatDate } from '../../utils/format';
import { unwrapError } from '../../services/api';

export default function AuditLogsPage() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], meta: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 20 };
    if (action) params.action = action;
    auditService
      .listAuditLogs(params)
      .then(setResult)
      .catch((err) => setError(unwrapError(err)))
      .finally(() => setLoading(false));
  }, [action, page]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Audit Logs</h1>

      <div className="card p-4">
        <label className="label" htmlFor="action">Filter by action</label>
        <input
          id="action"
          className="input"
          placeholder="e.g. LOGIN, ACCOUNT_FREEZE, AML_RULE_UPDATE"
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
        />
      </div>

      <div className="card">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : result.data.length === 0 ? (
          <EmptyState title="No audit records found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Timestamp</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">User</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Action</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Entity</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">IP Address</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.data.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 whitespace-nowrap text-slate-500">{formatDate(log.createdAt)}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{log.userEmail || 'system'}</td>
                      <td className="px-4 py-2 whitespace-nowrap font-medium">{log.action}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-slate-500">
                        {log.entityType}{log.entityId ? ` #${log.entityId.slice(-6)}` : ''}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-slate-500 font-mono text-xs">{log.ipAddress || '-'}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`badge ${log.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {log.success ? 'Success' : 'Failed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={result.meta} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
