'use client';

import { useState } from 'react';
import { Shield, ExternalLink, RefreshCw, Eye, Bell, Check, Save, Settings2, Database } from 'lucide-react';
import { allFacilities } from '@/lib/dummyData';
import { formatPct } from '@/lib/compliance';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { seedDatabase } from '@/lib/seedData';

function toDisplay(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function ragBadge(status) {
  if (status === 'GREEN') return 'bg-green-100 text-green-700 border-green-200';
  if (status === 'AMBER') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-red-100 text-red-700 border-red-200';
}

function ragDot(status) {
  if (status === 'GREEN') return 'bg-[#22c55e]';
  if (status === 'AMBER') return 'bg-[#f59e0b]';
  return 'bg-[#ef4444]';
}

const DEFAULT_ALERT_CONFIG = allFacilities.map(f => ({
  id: f.id,
  name: f.name,
  alertEmail: f.id === 'fac-1' ? 'jennifer@sunriseagedcare.com.au' : `manager@${f.name.toLowerCase().replace(/\s+/g,'-')}.com.au`,
  alertMobile: f.id === 'fac-1' ? '0412 345 678' : '',
  alertTime: '07:00',
  emailEnabled: true,
  smsEnabled: false,
  rowSaved: false,
  rowSaving: false,
}));

function Toggle({ checked, onChange }) {
  return (
    <label className="flex items-center cursor-pointer">
      <div className="relative">
        <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
        <div className={`w-9 h-5 rounded-full transition-colors ${checked ? 'bg-[#22c55e]' : 'bg-gray-200'}`} />
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
    </label>
  );
}

export default function AdminPage() {
  const [facilities, setFacilities] = useState(allFacilities);
  const [refreshing, setRefreshing] = useState(false);
  const [seeding, setSeeding]       = useState(false);
  const [seedResult, setSeedResult] = useState(null);

  // Alert config per facility
  const [alertConfig, setAlertConfig] = useLocalStorage('cm_facilityAlertConfig', DEFAULT_ALERT_CONFIG);

  // Global settings
  const [globalAlertTime, setGlobalAlertTime] = useLocalStorage('cm_globalAlertTime', '07:00');
  const [globalEmail,     setGlobalEmail]     = useLocalStorage('cm_globalEmail',     true);
  const [globalSms,       setGlobalSms]       = useLocalStorage('cm_globalSms',       false);
  const [globalSaved,     setGlobalSaved]     = useState(false);
  const [globalSaving,    setGlobalSaving]    = useState(false);

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }

  async function handleSeed() {
    setSeeding(true);
    setSeedResult(null);
    try {
      const result = await seedDatabase();
      setSeedResult(result.success ? 'success' : 'error');
    } catch {
      setSeedResult('error');
    } finally {
      setSeeding(false);
      setTimeout(() => setSeedResult(null), 5000);
    }
  }

  const green = facilities.filter(f => f.complianceStatus === 'GREEN').length;
  const amber = facilities.filter(f => f.complianceStatus === 'AMBER').length;
  const red   = facilities.filter(f => f.complianceStatus === 'RED').length;

  // Alert config helpers
  function updateRow(id, field, value) {
    setAlertConfig(prev => prev.map(r => r.id === id ? { ...r, [field]: value, rowSaved: false } : r));
  }

  function saveRow(id) {
    setAlertConfig(prev => prev.map(r => r.id === id ? { ...r, rowSaving: true } : r));
    setTimeout(() => {
      setAlertConfig(prev => prev.map(r =>
        r.id === id ? { ...r, rowSaving: false, rowSaved: true } : r
      ));
      setTimeout(() => {
        setAlertConfig(prev => prev.map(r => r.id === id ? { ...r, rowSaved: false } : r));
      }, 2500);
    }, 700);
  }

  function applyToAll() {
    setGlobalSaving(true);
    setAlertConfig(prev => prev.map(r => ({
      ...r,
      alertTime: globalAlertTime,
      emailEnabled: globalEmail,
      smsEnabled: globalSms,
    })));
    setTimeout(() => {
      setGlobalSaving(false);
      setGlobalSaved(true);
      setTimeout(() => setGlobalSaved(false), 3000);
    }, 800);
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#1e293b]" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Admin Overview</h1>
            <p className="text-sm text-gray-500 mt-0.5">All facilities — compliance snapshot</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60
              ${seedResult === 'success' ? 'bg-green-100 text-green-700 border border-green-200'
              : seedResult === 'error'   ? 'bg-red-100 text-red-700 border border-red-200'
              : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'}`}
          >
            {seeding
              ? <><span className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /> Seeding…</>
              : seedResult === 'success'
                ? <><Check className="w-4 h-4" /> Seeded!</>
                : seedResult === 'error'
                  ? 'Seed Failed'
                  : <><Database className="w-4 h-4" /> Seed Database</>}
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
        <div className="stat-gradient-green border border-green-200 rounded-xl p-3 md:p-4 text-center card-hover">
          <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Compliant</p>
          <p className="text-2xl md:text-3xl font-bold text-green-700 mt-1">{green}</p>
          <p className="text-xs text-green-500 mt-0.5">facilities</p>
        </div>
        <div className="stat-gradient-amber border border-amber-200 rounded-xl p-3 md:p-4 text-center card-hover">
          <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">At Risk</p>
          <p className="text-2xl md:text-3xl font-bold text-amber-700 mt-1">{amber}</p>
          <p className="text-xs text-amber-500 mt-0.5">facilities</p>
        </div>
        <div className="stat-gradient-red border border-red-200 rounded-xl p-3 md:p-4 text-center card-hover">
          <p className="text-xs font-medium text-red-600 uppercase tracking-wide">Non-Compliant</p>
          <p className="text-2xl md:text-3xl font-bold text-red-700 mt-1">{red}</p>
          <p className="text-xs text-red-500 mt-0.5">facilities</p>
        </div>
      </div>

      {/* ── Facilities Table ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">All Facilities</h2>
          <p className="text-xs text-gray-400 mt-0.5">{facilities.length} registered facilities</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Facility Name','State','Residents','Compliance %','Status','Last Active','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {facilities.map((fac, idx) => (
                <tr key={fac.id} className={`border-b border-gray-50 hover:bg-green-50/20 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${ragDot(fac.complianceStatus)}`} />
                      <span className="font-medium text-gray-900">{fac.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-600">{fac.state}</td>
                  <td className="px-4 py-4 text-gray-700">{fac.residents}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${Math.min(fac.compliancePct * 100, 100)}%`,
                            backgroundColor: fac.complianceStatus === 'GREEN' ? '#22c55e' : fac.complianceStatus === 'AMBER' ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                      <span className="font-medium text-gray-900 text-xs">{formatPct(fac.compliancePct)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${ragBadge(fac.complianceStatus)}`}>
                      {fac.complianceStatus}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-500 text-xs whitespace-nowrap">{toDisplay(fac.lastActive)}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-1">
                      <button className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium">
                        <Eye className="w-3 h-3" /> View
                      </button>
                      <button className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors text-xs font-medium">
                        <Bell className="w-3 h-3" /> Alert
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Facility Alert Configuration ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-[#22c55e]" />
          <div>
            <h2 className="font-semibold text-gray-900">Facility Alert Configuration</h2>
            <p className="text-xs text-gray-400 mt-0.5">Configure alert settings per facility</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Facility Name','Alert Email','Alert Mobile','Alert Time','Email','SMS',''].map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alertConfig.map((row, idx) => (
                <tr key={row.id} className={`border-b border-gray-50 hover:bg-green-50/20 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-800 text-sm whitespace-nowrap">{row.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="email"
                      value={row.alertEmail}
                      onChange={e => updateRow(row.id, 'alertEmail', e.target.value)}
                      className="w-48 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#22c55e] transition"
                      placeholder="manager@facility.com.au"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="tel"
                      value={row.alertMobile}
                      onChange={e => updateRow(row.id, 'alertMobile', e.target.value)}
                      className="w-32 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#22c55e] transition"
                      placeholder="04XX XXX XXX"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={row.alertTime}
                      onChange={e => updateRow(row.id, 'alertTime', e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#22c55e] bg-white"
                    >
                      <option value="06:00">6am</option>
                      <option value="07:00">7am</option>
                      <option value="08:00">8am</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <Toggle checked={row.emailEnabled} onChange={() => updateRow(row.id, 'emailEnabled', !row.emailEnabled)} />
                  </td>
                  <td className="px-4 py-3">
                    <Toggle checked={row.smsEnabled} onChange={() => updateRow(row.id, 'smsEnabled', !row.smsEnabled)} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => saveRow(row.id)}
                      disabled={row.rowSaving}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#22c55e] text-white rounded-lg hover:bg-green-600 transition-colors text-xs font-medium disabled:opacity-60 whitespace-nowrap"
                    >
                      {row.rowSaving ? (
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : row.rowSaved ? (
                        <><Check className="w-3 h-3" /> Saved</>
                      ) : (
                        <><Save className="w-3 h-3" /> Save</>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Global Settings Card ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex items-center gap-2 mb-5 pb-3 border-b border-gray-100">
          <Bell className="w-4 h-4 text-[#22c55e]" />
          <h2 className="font-semibold text-gray-900">Global Alert Settings</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Default Alert Time</label>
            <select
              value={globalAlertTime}
              onChange={e => setGlobalAlertTime(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e] bg-white"
            >
              <option value="06:00">6am AEST</option>
              <option value="07:00">7am AEST</option>
              <option value="08:00">8am AEST</option>
            </select>
          </div>
          <div className="flex flex-col justify-end gap-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={globalEmail} onChange={() => setGlobalEmail(v => !v)} />
                <div className={`w-11 h-6 rounded-full transition-colors ${globalEmail ? 'bg-[#22c55e]' : 'bg-gray-200'}`} />
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${globalEmail ? 'translate-x-5' : ''}`} />
              </div>
              <span className="text-sm text-gray-700">Master Email Alerts</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={globalSms} onChange={() => setGlobalSms(v => !v)} />
                <div className={`w-11 h-6 rounded-full transition-colors ${globalSms ? 'bg-[#22c55e]' : 'bg-gray-200'}`} />
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${globalSms ? 'translate-x-5' : ''}`} />
              </div>
              <span className="text-sm text-gray-700">Master SMS Alerts</span>
            </label>
          </div>
          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={applyToAll}
              disabled={globalSaving}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1e293b] text-white rounded-lg text-sm font-semibold hover:bg-slate-700 transition-colors disabled:opacity-60"
            >
              {globalSaving ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Applying…</>
              ) : globalSaved ? (
                <><Check className="w-4 h-4" /> Applied!</>
              ) : (
                'Apply to All Facilities'
              )}
            </button>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center mt-4">
        Admin panel — for internal use only · CareMinutes.ai
      </p>
    </div>
  );
}
