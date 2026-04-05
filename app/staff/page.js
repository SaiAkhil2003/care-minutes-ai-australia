'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Check, UserCheck, Database, RefreshCw } from 'lucide-react';
import { staff as dummyStaff } from '@/lib/dummyData';
import { getStaff, addStaff, updateStaff, deleteStaff, mapStaff } from '@/lib/db';
import { SEED_FACILITY_ID } from '@/lib/seedData';

const ROLES   = ['RN', 'EN', 'PCW'];
const TYPES   = ['Permanent', 'Casual', 'Agency'];
const FILTERS = ['All', 'RN', 'EN', 'PCW'];

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

      {/* ── Summary Cards ── */}
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

      {/* ── Add Staff Form ── */}
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
                      <td className="px-3 md:px-4 py-3 text-gray-600 whitespace-nowrap">{s.phone || '—'}</td>
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
    </div>
  );
}
