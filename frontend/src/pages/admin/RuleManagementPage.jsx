import React, { useEffect, useState } from 'react';
import * as amlService from '../../services/amlService';
import { LoadingState, ErrorState } from '../../components/LoadingState';
import ConfirmDialog from '../../components/ConfirmDialog';
import { unwrapError } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function RuleManagementPage() {
  const { showToast } = useToast();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingRule, setEditingRule] = useState(null);
  const [form, setForm] = useState({});
  const [pendingToggle, setPendingToggle] = useState(null);

  function load() {
    setLoading(true);
    amlService
      .listRules()
      .then(setRules)
      .catch((err) => setError(unwrapError(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openEdit(rule) {
    setEditingRule(rule);
    setForm({
      threshold: rule.threshold ?? '',
      timeWindowMinutes: rule.timeWindowMinutes ?? '',
      minTransactionCount: rule.minTransactionCount ?? '',
      percentBelowThreshold: rule.config?.percentBelowThreshold ?? '',
      severity: rule.severity,
    });
  }

  async function saveEdit(e) {
    e.preventDefault();
    try {
      const payload = {
        severity: form.severity,
      };
      if (form.threshold !== '') payload.threshold = Number(form.threshold);
      if (form.timeWindowMinutes !== '') payload.timeWindowMinutes = Number(form.timeWindowMinutes);
      if (form.minTransactionCount !== '') payload.minTransactionCount = Number(form.minTransactionCount);
      if (form.percentBelowThreshold !== '') payload.config = { percentBelowThreshold: Number(form.percentBelowThreshold) };

      await amlService.updateRule(editingRule._id, payload);
      showToast('Rule configuration updated', 'success');
      setEditingRule(null);
      load();
    } catch (err) {
      showToast(unwrapError(err), 'error');
    }
  }

  async function confirmToggle() {
    try {
      await amlService.toggleRule(pendingToggle._id, !pendingToggle.enabled);
      showToast(`Rule ${!pendingToggle.enabled ? 'enabled' : 'disabled'}`, 'success');
      setPendingToggle(null);
      load();
    } catch (err) {
      showToast(unwrapError(err), 'error');
      setPendingToggle(null);
    }
  }

  if (loading) return <LoadingState label="Loading AML rules..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">AML Rule Management</h1>
        <p className="text-sm text-slate-500">
          Enable, disable, and configure AML detection rules without any code changes. Disabled rules will not
          trigger alerts for new transactions.
        </p>
      </div>

      <div className="space-y-4">
        {rules.map((rule) => (
          <div key={rule._id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-slate-800">{rule.ruleName}</h2>
                  <span className={`badge ${rule.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <span className="badge bg-slate-100 text-slate-600">{rule.ruleCode}</span>
                </div>
                <p className="text-sm text-slate-500 mt-1 max-w-xl">{rule.description}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button type="button" className="btn-secondary btn-sm" onClick={() => openEdit(rule)}>
                  Configure
                </button>
                <button
                  type="button"
                  className={rule.enabled ? 'btn-danger btn-sm' : 'btn-primary btn-sm'}
                  onClick={() => setPendingToggle(rule)}
                >
                  {rule.enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs text-slate-600">
              {rule.threshold != null && <Field label="Threshold" value={`₹${Number(rule.threshold).toLocaleString('en-IN')}`} />}
              {rule.timeWindowMinutes != null && <Field label="Time Window" value={`${rule.timeWindowMinutes} min`} />}
              {rule.minTransactionCount != null && <Field label="Min Txn Count" value={rule.minTransactionCount} />}
              {rule.config?.percentBelowThreshold != null && <Field label="% Below Threshold" value={`${rule.config.percentBelowThreshold}%`} />}
              <Field label="Severity" value={rule.severity} />
            </dl>
          </div>
        ))}
      </div>

      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="card w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Configure {editingRule.ruleName}</h3>
            <form onSubmit={saveEdit} className="space-y-3">
              {editingRule.ruleType === 'LARGE_TRANSACTION' && (
                <NumberField label="Threshold (INR)" value={form.threshold} onChange={(v) => setForm({ ...form, threshold: v })} />
              )}
              {editingRule.ruleType === 'HIGH_FREQUENCY' && (
                <>
                  <NumberField label="Time Window (minutes)" value={form.timeWindowMinutes} onChange={(v) => setForm({ ...form, timeWindowMinutes: v })} />
                  <NumberField label="Minimum Transaction Count" value={form.minTransactionCount} onChange={(v) => setForm({ ...form, minTransactionCount: v })} />
                </>
              )}
              {editingRule.ruleType === 'STRUCTURING' && (
                <>
                  <NumberField label="Reporting Threshold (INR)" value={form.threshold} onChange={(v) => setForm({ ...form, threshold: v })} />
                  <NumberField label="Time Window (minutes)" value={form.timeWindowMinutes} onChange={(v) => setForm({ ...form, timeWindowMinutes: v })} />
                  <NumberField label="Minimum Transaction Count" value={form.minTransactionCount} onChange={(v) => setForm({ ...form, minTransactionCount: v })} />
                  <NumberField label="Percent Below Threshold (%)" value={form.percentBelowThreshold} onChange={(v) => setForm({ ...form, percentBelowThreshold: v })} />
                </>
              )}
              <div>
                <label className="label">Severity</label>
                <select className="input" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setEditingRule(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Configuration</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingToggle}
        title={pendingToggle?.enabled ? 'Disable this rule?' : 'Enable this rule?'}
        description={
          pendingToggle?.enabled
            ? 'New transactions will no longer be checked against this rule.'
            : 'New transactions will be checked against this rule again.'
        }
        confirmLabel={pendingToggle?.enabled ? 'Disable' : 'Enable'}
        danger={!!pendingToggle?.enabled}
        onConfirm={confirmToggle}
        onCancel={() => setPendingToggle(null)}
      />
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-700">{value}</dd>
    </div>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type="number" className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
