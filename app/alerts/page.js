'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCircle, AlertTriangle, Mail, RefreshCw, Zap, X, Database, Sparkles, Clock } from 'lucide-react';
import { alerts as dummyAlerts } from '@/lib/dummyData';
import { getAlerts, saveAlert, mapAlert } from '@/lib/db';
import { SEED_FACILITY_ID } from '@/lib/seedData';

function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  const isError = toast.type === 'error';
  return (
    <div className={`fixed bottom-24 md:bottom-6 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-50 flex items-start gap-3 px-4 py-3.5 rounded-xl shadow-lg border text-sm font-medium md:max-w-sm transition-all
      ${isError ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}
    >
      {isError
        ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
        : <CheckCircle  className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
      }
      <span className="flex-1">{toast.message}</span>
      <button onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity ml-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Dummy alerts with trigger/aiGenerated fields added for display
const enrichedDummyAlerts = dummyAlerts.map(a => ({
  ...a,
  trigger:     'AUTO',
  aiGenerated: false,
}));

export default function AlertsPage() {
  const [alerts, setAlerts]         = useState(enrichedDummyAlerts);
  const [usingDb, setUsingDb]       = useState(false);
  const [dbLoading, setDbLoading]   = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated]   = useState(false);
  const [toast, setToast]           = useState(null);

  // ── Load alerts from Supabase ───────────────────────────────────────────────
  const loadFromDb = useCallback(async () => {
    setDbLoading(true);
    try {
      const { data, error } = await getAlerts(SEED_FACILITY_ID);
      if (!error && data && data.length > 0) {
        setAlerts(data.map(a => ({ ...mapAlert(a), trigger: a.trigger || 'AUTO', aiGenerated: a.ai_generated || false })));
        setUsingDb(true);
      }
    } catch {
      // keep dummy data
    } finally {
      setDbLoading(false);
    }
  }, []);

  useEffect(() => { loadFromDb(); }, [loadFromDb]);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }

  // ── Generate alert (manual trigger) ────────────────────────────────────────
  async function handleGenerate() {
    setGenerating(true);
    setGenerated(false);

    try {
      const res  = await fetch('/api/alerts/send', { method: 'POST' });
      const data = await res.json();

      if (!res.ok || data.error) throw new Error(data.error || 'Failed to send alert.');

      const newAlert = {
        ...data.alert,
        trigger:     'MANUAL',
        aiGenerated: data.aiGenerated ?? false,
      };

      // Save to Supabase if connected
      if (usingDb) {
        const { data: saved } = await saveAlert(SEED_FACILITY_ID, {
          date:           newAlert.date,
          status:         newAlert.status,
          title:          newAlert.title,
          message:        newAlert.message,
          gaps:           newAlert.gaps           ?? [],
          suggestedStaff: newAlert.suggestedStaff ?? [],
          sentViaEmail:   true,
        });
        if (saved) {
          setAlerts(prev => [{ ...mapAlert(saved), trigger: 'MANUAL', aiGenerated: data.aiGenerated ?? false }, ...prev]);
          setGenerated(true);
          showToast(`Alert sent to ${data.toEmail} and saved to database`);
          setTimeout(() => setGenerated(false), 3000);
          return;
        }
      }

      setAlerts(prev => [newAlert, ...prev]);
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
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">AI Shift Gap Alerts</h1>
            {usingDb ? (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full border border-green-200">
                <Database className="w-3 h-3" /> Live DB
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">Demo Data</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Daily compliance analysis — sent at 07:00 AEST</p>
        </div>
        <div className="flex gap-2">
          {usingDb && (
            <button onClick={loadFromDb} disabled={dbLoading} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${dbLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button onClick={handleGenerate} disabled={generating}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1e293b] text-white rounded-lg text-sm font-semibold hover:bg-slate-700 active:bg-slate-800 transition-colors disabled:opacity-60 flex-1 sm:flex-none">
            {generating
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending alert…</>
              : generated
                ? <><CheckCircle className="w-4 h-4" /> Alert Sent!</>
                : <><Zap className="w-4 h-4" /> Generate Alert Now</>}
          </button>
        </div>
      </div>

      {/* ── Summary ── */}
      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 card-hover">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total Alerts</p>
          <p className="text-xl md:text-2xl font-bold text-gray-900 mt-1">{alerts.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Last 7 days</p>
        </div>
        <div className="stat-gradient-green rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 card-hover">
          <p className="text-xs text-gray-500 uppercase tracking-wide">On Track</p>
          <p className="text-xl md:text-2xl font-bold text-green-600 mt-1">{onTrackCount}</p>
        </div>
        <div className="stat-gradient-amber rounded-xl shadow-sm border border-gray-100 p-3 md:p-4 card-hover">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Action Needed</p>
          <p className="text-xl md:text-2xl font-bold text-amber-600 mt-1">{actionCount}</p>
        </div>
      </div>

      {/* ── Alerts List ── */}
      <div className="space-y-3 md:space-y-4">
        {alerts.map(alert => (
          <div key={alert.id}
            className={`bg-white rounded-xl shadow-sm border overflow-hidden card-hover ${alert.status === 'Action Needed' ? 'border-amber-200' : 'border-gray-100'}`}>
            {/* Card header */}
            <div className={`px-4 md:px-5 py-3 flex items-start justify-between gap-3 ${alert.status === 'Action Needed' ? 'bg-amber-50' : 'bg-green-50'}`}>
              <div className="flex items-start gap-2 flex-wrap min-w-0">
                {alert.status === 'Action Needed'
                  ? <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  : <CheckCircle  className="w-4 h-4 text-green-600  shrink-0 mt-0.5" />
                }
                <span className="text-sm font-semibold text-gray-900 break-words">{alert.title}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${alert.status === 'Action Needed' ? 'bg-amber-200 text-amber-800' : 'bg-green-200 text-green-800'}`}>
                  {alert.status}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(alert.date)}</span>
                {/* Trigger badge: AUTO or MANUAL */}
                {alert.trigger === 'MANUAL' ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold whitespace-nowrap">
                    <Zap className="w-3 h-3" /> MANUAL
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-bold whitespace-nowrap">
                    <Clock className="w-3 h-3" /> AUTO
                  </span>
                )}
                {/* AI Generated badge */}
                {alert.aiGenerated && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold whitespace-nowrap">
                    <Sparkles className="w-3 h-3" /> AI Generated
                  </span>
                )}
                {alert.sentViaEmail && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium whitespace-nowrap">
                    <Mail className="w-3 h-3" /> Email
                  </span>
                )}
              </div>
            </div>

            {/* Card body */}
            <div className="px-4 md:px-5 py-4 space-y-3 md:space-y-4">
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-500 mb-1">
                    {alert.aiGenerated ? 'Gemini AI · CareMinutes.ai Analysis' : 'CareMinutes AI Analysis'}
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">{alert.message}</p>
                </div>
              </div>

              {alert.gaps && alert.gaps.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-700 mb-2 uppercase tracking-wide">Identified Gaps</p>
                  <ul className="space-y-1">
                    {alert.gaps.map((gap, i) => (
                      <li key={i} className="text-xs text-red-700 flex items-start gap-1.5">
                        <span className="mt-0.5 shrink-0">•</span><span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {alert.suggestedStaff && alert.suggestedStaff.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">Suggested Staff to Contact</p>
                  <ul className="space-y-1">
                    {alert.suggestedStaff.map((s, i) => (
                      <li key={i} className="text-xs text-blue-700 flex items-start gap-1.5">
                        <span className="mt-0.5 shrink-0">→</span><span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Empty state ── */}
      {alerts.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">No alerts yet</p>
          <p className="text-sm text-gray-400 mt-1">Alerts are generated daily at 07:00 AEST</p>
        </div>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
