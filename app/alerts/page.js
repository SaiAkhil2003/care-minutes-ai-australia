'use client';

import { useState } from 'react';
import { Bell, CheckCircle, AlertTriangle, Mail, RefreshCw, Zap, X } from 'lucide-react';
import { alerts as initialAlerts } from '@/lib/dummyData';

function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  const isError = toast.type === 'error';
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-start gap-3 px-5 py-3.5 rounded-xl shadow-lg border text-sm font-medium max-w-sm w-full transition-all
        ${isError
          ? 'bg-red-50 border-red-200 text-red-800'
          : 'bg-green-50 border-green-200 text-green-800'
        }`}
    >
      {isError
        ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
        : <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
      }
      <span className="flex-1">{toast.message}</span>
      <button onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity ml-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function AlertsPage() {
  const [alerts, setAlerts]     = useState(initialAlerts);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated]   = useState(false);
  const [toast, setToast]           = useState(null);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenerated(false);

    try {
      const res = await fetch('/api/alerts/send', { method: 'POST' });
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to send alert.');
      }

      // Add the new alert to the top of the list
      setAlerts(prev => [data.alert, ...prev]);
      setGenerated(true);
      showToast(`Alert sent to ${data.toEmail}`);
      setTimeout(() => setGenerated(false), 3000);
    } catch (err) {
      showToast(err.message || 'Failed to send alert. Please try again.', 'error');
    } finally {
      setGenerating(false);
    }
  }

  const onTrackCount = alerts.filter(a => a.status === 'On Track').length;
  const actionCount  = alerts.filter(a => a.status === 'Action Needed').length;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Shift Gap Alerts</h1>
          <p className="text-sm text-gray-500 mt-0.5">Daily compliance analysis — sent at 07:00 AEST</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1e293b] text-white rounded-lg text-sm font-semibold hover:bg-slate-700 transition-colors disabled:opacity-60"
        >
          {generating ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Sending alert…</>
          ) : generated ? (
            <><CheckCircle className="w-4 h-4" /> Alert Sent!</>
          ) : (
            <><Zap className="w-4 h-4" /> Generate Alert Now</>
          )}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Alerts</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{alerts.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Last 7 days</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">On Track</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{onTrackCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Action Needed</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{actionCount}</p>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {alerts.map(alert => (
          <div
            key={alert.id}
            className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
              alert.status === 'Action Needed' ? 'border-amber-200' : 'border-gray-100'
            }`}
          >
            {/* Card header */}
            <div className={`px-5 py-3 flex items-start justify-between gap-3 ${
              alert.status === 'Action Needed' ? 'bg-amber-50' : 'bg-green-50'
            }`}>
              <div className="flex items-center gap-2 flex-wrap">
                {alert.status === 'Action Needed'
                  ? <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  : <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                }
                <span className="text-sm font-semibold text-gray-900">{alert.title}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  alert.status === 'Action Needed'
                    ? 'bg-amber-200 text-amber-800'
                    : 'bg-green-200 text-green-800'
                }`}>
                  {alert.status}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(alert.date)}</span>
                {alert.sentViaEmail && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    <Mail className="w-3 h-3" /> Sent via Email
                  </span>
                )}
              </div>
            </div>

            {/* Card body */}
            <div className="px-5 py-4 space-y-4">
              {/* AI message */}
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">CareMinutes AI Analysis</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{alert.message}</p>
                </div>
              </div>

              {/* Gaps */}
              {alert.gaps && alert.gaps.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-700 mb-2 uppercase tracking-wide">Identified Gaps</p>
                  <ul className="space-y-1">
                    {alert.gaps.map((gap, i) => (
                      <li key={i} className="text-xs text-red-700 flex items-start gap-1.5">
                        <span className="mt-0.5 shrink-0">•</span>
                        {gap}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggested staff */}
              {alert.suggestedStaff && alert.suggestedStaff.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">Suggested Staff to Contact</p>
                  <ul className="space-y-1">
                    {alert.suggestedStaff.map((s, i) => (
                      <li key={i} className="text-xs text-blue-700 flex items-start gap-1.5">
                        <span className="mt-0.5 shrink-0">→</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {alerts.length === 0 && (
        <div className="text-center py-20">
          <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No alerts yet</p>
          <p className="text-sm text-gray-400 mt-1">Alerts are generated daily at 07:00 AEST</p>
        </div>
      )}

      {/* Toast notification */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
