'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Check, UserCheck, Database, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react';
import { staff as dummyStaff, TODAY } from '@/lib/dummyData';
import { getStaff, addStaff, updateStaff, deleteStaff, mapStaff } from '@/lib/db';
import { SEED_FACILITY_ID } from '@/lib/seedData';

const ROLES   = ['RN', 'EN', 'PCW'];
const TYPES   = ['Permanent', 'Casual', 'Agency'];
const FILTERS = ['All', 'RN', 'EN', 'PCW'];
const TABS    = ['Staff List', 'Qualifications'];

// ─── Qualification helpers ────────────────────────────────────────────────────

const QUALS = [
  { key: 'ahpraExpiry',          label: 'AHPRA',          roles: ['RN','EN'] },
  { key: 'policeCheckExpiry',    label: 'Police Check',   roles: ['RN','EN','PCW'] },
  { key: 'firstAidExpiry',       label: 'First Aid',      roles: ['RN','EN','PCW'] },
  { key: 'wwcExpiry',            label: 'WWC',            roles: ['RN','EN','PCW'] },
  { key: 'manualHandlingExpiry', label: 'Manual Handling',roles: ['RN','EN','PCW'] },
];

function daysUntilExpiry(isoDate) {
  if (!isoDate) return null;
  const diff = new Date(isoDate + 'T00:00:00') - new Date(TODAY + 'T00:00:00');
  return Math.round(diff / 86400000);
}

function QualBadge({ isoDate, required }) {
  if (!required) return <span className="text-xs text-gray-300">N/A</span>;
  if (!isoDate)  return <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">Not set</span>;
  const days = daysUntilExpiry(isoDate);
  const fmt  = new Date(isoDate + 'T00:00:00').toLocaleDateString('en-AU', { day:'2-digit', month:'2-digit', year:'numeric' });
  if (days === null) return null;
  if (days < 0)   return <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-900 text-white" title={fmt}>Expired</span>;
  if (days <= 7)  return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700" title={fmt}>⚠ {days}d</span>;
  if (days <= 30) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700" title={fmt}>{days}d</span>;
  if (days <= 90) return <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700" title={fmt}>~{Math.round(days/30)}mo</span>;
  return <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700" title={fmt}>Valid</span>;
}

function overallQualStatus(member) {
  let worst = 'valid';
  for (const q of QUALS) {
    if (!member[q.key]) continue;
    const days = daysUntilExpiry(member[q.key]);
    if (days === null) continue;
    if (days < 0)       { worst = 'expired'; break; }
    else if (days <= 7) { worst = 'critical'; }
    else if (days <= 30 && worst !== 'critical') { worst = 'expiring'; }
    else if (days <= 90 && worst !== 'critical' && worst !== 'expiring') { worst = 'soon'; }
  }
  return worst;
}

// Convert Australian mobile 04XX XXX XXX → +614XXXXXXXX
function toIntlPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('04')) {
    return '+61' + digits.slice(1);
  }
  return phone;
}

function PhoneLink({ phone }) {
  if (!phone) return '—';
  return (
    <a href={`tel:${toIntlPhone(phone)}`} className="text-blue-600 underline hover:text-blue-800 transition-colors">
      {phone}
    </a>
  );
}

function roleBadge(role) {
  if (role === 'RN') return 'bg-blue-100 text-blue-700';
  if (role === 'EN') return 'bg-purple-100 text-purple-700';
  return 'bg-gray-100 text-gray-600';
}

function typeBadge(type) {
  if (type === 'Agency')  return 'bg-amber-100 text-amber-700';
  if (type === 'Casual')  return 'bg-cyan-100 text-cyan-700';
  return 'bg-green-100 text-green-700';
}

const EMPTY_FORM = { name: '', role: 'RN', employmentType: 'Permanent', phone: '', email: '' };

export default function StaffPage() {
  const [staffList, setStaffList]   = useState(dummyStaff);
  const [usingDb, setUsingDb]       = useState(false);
  const [dbLoading, setDbLoading]   = useState(true);
  const [activeTab, setActiveTab]   = useState('Staff List');
  const [filter, setFilter]         = useState('All');
  const [form, setForm]             = useState(EMPTY_FORM);
  const [editId, setEditId]         = useState(null);
  const [editForm, setEditForm]     = useState({});
  const [loading, setLoading]       = useState(false);
  const [success, setSuccess]       = useState(false);
  const [errors, setErrors]         = useState({});

  // ── Load from Supabase ──────────────────────────────────────────────────────
  const loadFromDb = useCallback(async () => {
    setDbLoading(true);
    try {
      const { data, error } = await getStaff(SEED_FACILITY_ID);
      if (!error && data && data.length > 0) {
        setStaffList(data.map(mapStaff));
        setUsingDb(true);
      }
    } catch {
      // keep dummy data
    } finally {
      setDbLoading(false);
    }
  }, []);

  useEffect(() => { loadFromDb(); }, [loadFromDb]);

  // Summary counts
  const counts = {
    total:  staffList.length,
    rn:     staffList.filter(s => s.role === 'RN').length,
    en:     staffList.filter(s => s.role === 'EN').length,
    pcw:    staffList.filter(s => s.role === 'PCW').length,
    agency: staffList.filter(s => s.employmentType === 'Agency').length,
  };

  const filtered = filter === 'All' ? staffList : staffList.filter(s => s.role === filter);

  function validate(f) {
    const e = {};
    if (!f.name.trim()) e.name = 'Name is required';
    if (f.phone && !/^04\d{2} \d{3} \d{3}$/.test(f.phone)) e.phone = 'Format: 04XX XXX XXX';
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Invalid email address';
    return e;
  }

  // ── Add staff ───────────────────────────────────────────────────────────────
  async function handleAdd(e) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    if (usingDb) {
      const { data, error } = await addStaff(SEED_FACILITY_ID, form);
      if (!error && data) {
        setStaffList(prev => [...prev, mapStaff(data)]);
      } else {
        setStaffList(prev => [...prev, { id: `local-${Date.now()}`, ...form, status: 'Active' }]);
      }
    } else {
      setStaffList(prev => [...prev, { id: `local-${Date.now()}`, ...form, status: 'Active' }]);
    }

    setForm(EMPTY_FORM);
    setLoading(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  }

  // ── Delete staff ────────────────────────────────────────────────────────────
  async function handleDelete(id) {
    if (usingDb) {
      await deleteStaff(id); // soft delete (is_active = false)
    }
    setStaffList(prev => prev.filter(s => s.id !== id));
  }

  // ── Start edit ──────────────────────────────────────────────────────────────
  function startEdit(s) {
    setEditId(s.id);
    setEditForm({ name: s.name, role: s.role, employmentType: s.employmentType, phone: s.phone, email: s.email });
  }

  // ── Save edit ───────────────────────────────────────────────────────────────
  async function saveEdit(id) {
    const errs = validate(editForm);
    if (Object.keys(errs).length) return;

    if (usingDb) {
      const { data, error } = await updateStaff(id, editForm);
      if (!error && data) {
        setStaffList(prev => prev.map(s => s.id === id ? mapStaff(data) : s));
      } else {
        setStaffList(prev => prev.map(s => s.id === id ? { ...s, ...editForm } : s));
      }
    } else {
      setStaffList(prev => prev.map(s => s.id === id ? { ...s, ...editForm } : s));
    }
    setEditId(null);
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">Staff Management</h1>
            {usingDb ? (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full border border-green-200">
                <Database className="w-3 h-3" /> Live DB
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">Demo Data</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Manage your care team</p>
        </div>
        {usingDb && (
          <button onClick={loadFromDb} disabled={dbLoading} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${dbLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab
                ? 'border-[#22c55e] text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab}
            {tab === 'Qualifications' && (() => {
              const exp = dummyStaff.filter(m => {
                for (const q of QUALS) {
                  if (!m[q.key]) continue;
                  const d = daysUntilExpiry(m[q.key]);
                  if (d !== null && d <= 30) return true;
                }
                return false;
              }).length;
              return exp > 0 ? (
                <span className="ml-1.5 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">{exp} expiring soon</span>
              ) : null;
            })()}
          </button>
        ))}
      </div>

      {/* ── Summary Cards ── */}
      {activeTab === 'Staff List' && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total',  value: counts.total,  colour: 'text-gray-900',   bg: 'bg-white'             },
            { label: 'RN',     value: counts.rn,     colour: 'text-blue-700',   bg: 'stat-gradient-blue'   },
            { label: 'EN',     value: counts.en,     colour: 'text-purple-700', bg: 'stat-gradient-purple' },
            { label: 'PCW',    value: counts.pcw,    colour: 'text-green-700',  bg: 'stat-gradient-green'  },
            { label: 'Agency', value: counts.agency, colour: 'text-amber-700',  bg: 'stat-gradient-amber'  },
          ].map(({ label, value, colour, bg }) => (
            <div key={label} className={`${bg} rounded-xl border border-gray-100 shadow-sm p-3 md:p-4 card-hover`}>
              <p className="text-xs font-medium text-gray-500">{label}</p>
              <p className={`text-xl md:text-2xl font-bold mt-1 ${colour}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Staff Form + Filters + Table (Staff List tab only) ── */}
      {activeTab === 'Staff List' && (<>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-green-600" /> Add New Staff Member
        </h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Sarah Chen"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.name ? 'border-red-300' : 'border-gray-200'}`} />
            {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role *</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Employment Type *</label>
            <select value={form.employmentType} onChange={e => setForm(f => ({ ...f, employmentType: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
            <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="0411 222 333"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.phone ? 'border-red-300' : 'border-gray-200'}`} />
            {errors.phone && <p className="text-xs text-red-500 mt-0.5">{errors.phone}</p>}
          </div>
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="name@facility.com.au"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.email ? 'border-red-300' : 'border-gray-200'}`} />
            {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email}</p>}
          </div>
          <div className="sm:col-span-2 lg:col-span-5">
            <button type="submit" disabled={loading}
              className="flex items-center justify-center gap-2 px-5 py-2 bg-[#22c55e] text-white rounded-lg text-sm font-semibold hover:bg-green-600 active:bg-green-700 transition-colors disabled:opacity-60 w-full sm:w-auto">
              {loading
                ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Adding…</>
                : success
                  ? <><Check className="w-4 h-4" /> Staff Member Added!</>
                  : <><UserCheck className="w-4 h-4" /> Add Staff Member</>}
            </button>
          </div>
        </form>
      </div>

      {/* ── Filter buttons ── */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${filter === f ? 'bg-[#1e293b] text-white border-[#1e293b]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
            {f} {f !== 'All' && <span className="ml-1 opacity-70">({counts[f.toLowerCase()]})</span>}
          </button>
        ))}
      </div>

      {/* ── Staff Table ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Name','Role','Type','Phone','Email','Status','Actions'].map(h => (
                  <th key={h} className="text-left px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-gray-400 py-12 text-sm">No staff found.</td></tr>
              ) : filtered.map((s, idx) => (
                <tr key={s.id} className={`border-b border-gray-50 transition-colors hover:bg-green-50/30 ${idx % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                  {editId === s.id ? (
                    <>
                      <td className="px-3 md:px-4 py-2"><input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="border border-gray-200 rounded px-2 py-1 text-xs w-32" /></td>
                      <td className="px-3 md:px-4 py-2">
                        <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} className="border border-gray-200 rounded px-2 py-1 text-xs bg-white">
                          {ROLES.map(r => <option key={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="px-3 md:px-4 py-2">
                        <select value={editForm.employmentType} onChange={e => setEditForm(f => ({ ...f, employmentType: e.target.value }))} className="border border-gray-200 rounded px-2 py-1 text-xs bg-white">
                          {TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="px-3 md:px-4 py-2"><input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="border border-gray-200 rounded px-2 py-1 text-xs w-28" placeholder="04XX XXX XXX" /></td>
                      <td className="px-3 md:px-4 py-2"><input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="border border-gray-200 rounded px-2 py-1 text-xs w-36" /></td>
                      <td className="px-3 md:px-4 py-2"><span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">Active</span></td>
                      <td className="px-3 md:px-4 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => saveEdit(s.id)} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setEditId(null)} className="p-1.5 bg-gray-100 text-gray-500 rounded hover:bg-gray-200 transition-colors"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 md:px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{s.name}</td>
                      <td className="px-3 md:px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${roleBadge(s.role)}`}>{s.role}</span></td>
                      <td className="px-3 md:px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${typeBadge(s.employmentType)}`}>{s.employmentType}</span></td>
                      <td className="px-3 md:px-4 py-3 whitespace-nowrap">{s.phone ? <PhoneLink phone={s.phone} /> : '—'}</td>
                      <td className="px-3 md:px-4 py-3 text-gray-600 max-w-[160px] truncate">{s.email || '—'}</td>
                      <td className="px-3 md:px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${s.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{s.status}</span></td>
                      <td className="px-3 md:px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(s)} className="p-1.5 bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(s.id)} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>)}

      {/* ══════════════════════════════════════════════════════════════════════════
          QUALIFICATIONS TAB (Feature 2)
      ══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'Qualifications' && (
        <div>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold">⚠ Xd</span> Critical ≤7 days</span>
            <span className="flex items-center gap-1.5"><span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">Xd</span> Expiring ≤30 days</span>
            <span className="flex items-center gap-1.5"><span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-700 font-medium">~Xmo</span> Due ≤90 days</span>
            <span className="flex items-center gap-1.5"><span className="px-2 py-0.5 rounded bg-green-100 text-green-700 font-medium">Valid</span> &gt;90 days</span>
            <span className="flex items-center gap-1.5"><span className="px-2 py-0.5 rounded bg-gray-900 text-white font-bold">Expired</span> Past expiry</span>
            <span className="flex items-center gap-1.5"><span className="text-gray-300">N/A</span> Not required for role</span>
          </div>

          {/* Qualifications Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                    {QUALS.map(q => (
                      <th key={q.key} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{q.label}</th>
                    ))}
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Overall</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.filter(s => s.status === 'Active').map((s, idx) => {
                    const status = overallQualStatus(s);
                    return (
                      <tr key={s.id} className={`border-b border-gray-50 hover:bg-green-50/20 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{s.name}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${roleBadge(s.role)}`}>{s.role}</span></td>
                        {QUALS.map(q => (
                          <td key={q.key} className="px-4 py-3">
                            <QualBadge isoDate={s[q.key]} required={q.roles.includes(s.role)} />
                          </td>
                        ))}
                        <td className="px-4 py-3">
                          {status === 'critical' && <span className="flex items-center gap-1 text-xs font-bold text-red-700"><AlertTriangle className="w-3 h-3" /> Critical</span>}
                          {status === 'expiring' && <span className="flex items-center gap-1 text-xs font-bold text-amber-600"><AlertTriangle className="w-3 h-3" /> Expiring</span>}
                          {status === 'soon'     && <span className="flex items-center gap-1 text-xs font-medium text-yellow-600"><AlertTriangle className="w-3 h-3" /> Due soon</span>}
                          {status === 'expired'  && <span className="flex items-center gap-1 text-xs font-bold text-gray-900"><AlertTriangle className="w-3 h-3" /> Expired</span>}
                          {status === 'valid'    && <span className="flex items-center gap-1 text-xs font-medium text-green-600"><ShieldCheck className="w-3 h-3" /> Valid</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expiry alerts list */}
          {(() => {
            const expiring = [];
            for (const member of staffList) {
              for (const q of QUALS) {
                if (!member[q.key]) continue;
                const days = daysUntilExpiry(member[q.key]);
                if (days !== null && days <= 90) {
                  expiring.push({ staffName: member.name, label: q.label, days, expiry: member[q.key] });
                }
              }
            }
            expiring.sort((a, b) => a.days - b.days);
            if (expiring.length === 0) return null;
            return (
              <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Upcoming Expiries — Action Required
                </h3>
                <div className="space-y-2">
                  {expiring.map((e, i) => (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-lg border gap-2 ${
                      e.days <= 7  ? 'bg-red-50 border-red-200'    :
                      e.days <= 30 ? 'bg-amber-50 border-amber-200' :
                                     'bg-yellow-50 border-yellow-200'
                    }`}>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{e.staffName} — {e.label}</p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          Expires {new Date(e.expiry + 'T00:00:00').toLocaleDateString('en-AU', { day:'2-digit', month:'2-digit', year:'numeric' })}
                          {e.days <= 7 && ' — Renew immediately to maintain RN compliance coverage'}
                          {e.days > 7 && e.days <= 30 && ' — Action needed within 30 days'}
                          {e.days > 30 && ' — Renewal due within 90 days'}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                        e.days <= 0  ? 'bg-gray-900 text-white'       :
                        e.days <= 7  ? 'bg-red-600 text-white'        :
                        e.days <= 30 ? 'bg-amber-500 text-white'      :
                                       'bg-yellow-400 text-yellow-900'
                      }`}>
                        {e.days <= 0 ? 'Expired' : `${e.days} days`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
