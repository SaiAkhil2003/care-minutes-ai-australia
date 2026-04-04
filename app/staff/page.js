'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, Users, UserCheck } from 'lucide-react';
import { staff as initialStaff } from '@/lib/dummyData';
import { useLocalStorage } from '@/lib/useLocalStorage';

const ROLES   = ['RN', 'EN', 'PCW'];
const TYPES   = ['Permanent', 'Casual', 'Agency'];
const FILTERS = ['All', 'RN', 'EN', 'PCW'];

function roleBadge(role) {
  if (role === 'RN')  return 'bg-blue-100 text-blue-700';
  if (role === 'EN')  return 'bg-purple-100 text-purple-700';
  return 'bg-gray-100 text-gray-600';
}

function typeBadge(type) {
  if (type === 'Agency')   return 'bg-amber-100 text-amber-700';
  if (type === 'Casual')   return 'bg-cyan-100 text-cyan-700';
  return 'bg-green-100 text-green-700';
}

const EMPTY_FORM = { name: '', role: 'RN', employmentType: 'Permanent', phone: '', email: '' };

export default function StaffPage() {
  const [staffList, setStaffList]   = useLocalStorage('careminutes_staff', initialStaff);
  const [filter, setFilter]         = useState('All');
  const [form, setForm]             = useState(EMPTY_FORM);
  const [editId, setEditId]         = useState(null);
  const [editForm, setEditForm]     = useState({});
  const [loading, setLoading]       = useState(false);
  const [success, setSuccess]       = useState(false);
  const [errors, setErrors]         = useState({});

  // Summary counts
  const counts = {
    total:  staffList.length,
    rn:     staffList.filter(s => s.role === 'RN').length,
    en:     staffList.filter(s => s.role === 'EN').length,
    pcw:    staffList.filter(s => s.role === 'PCW').length,
    agency: staffList.filter(s => s.employmentType === 'Agency').length,
  };

  // Filtered list
  const filtered = filter === 'All' ? staffList : staffList.filter(s => s.role === filter);

  function validate(f) {
    const e = {};
    if (!f.name.trim())   e.name  = 'Name is required';
    if (f.phone && !/^04\d{2} \d{3} \d{3}$/.test(f.phone)) e.phone = 'Format: 04XX XXX XXX';
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Invalid email address';
    return e;
  }

  function handleAdd(e) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    setTimeout(() => {
      setStaffList(prev => [...prev, {
        id: `staff-new-${Date.now()}`,
        ...form,
        status: 'Active',
      }]);
      setForm(EMPTY_FORM);
      setLoading(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    }, 500);
  }

  function handleDelete(id) {
    setStaffList(prev => prev.filter(s => s.id !== id));
  }

  function startEdit(s) {
    setEditId(s.id);
    setEditForm({ name: s.name, role: s.role, employmentType: s.employmentType, phone: s.phone, email: s.email });
  }

  function saveEdit(id) {
    const errs = validate(editForm);
    if (Object.keys(errs).length) return;
    setStaffList(prev => prev.map(s => s.id === id ? { ...s, ...editForm } : s));
    setEditId(null);
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Staff Management</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your care team</p>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total Staff', value: counts.total,  colour: 'text-gray-900',   bg: 'bg-gray-50'    },
          { label: 'RN',         value: counts.rn,     colour: 'text-blue-700',   bg: 'bg-blue-50'   },
          { label: 'EN',         value: counts.en,     colour: 'text-purple-700', bg: 'bg-purple-50' },
          { label: 'PCW',        value: counts.pcw,    colour: 'text-green-700',  bg: 'bg-green-50'  },
          { label: 'Agency',     value: counts.agency, colour: 'text-amber-700',  bg: 'bg-amber-50'  },
        ].map(({ label, value, colour, bg }) => (
          <div key={label} className={`${bg} rounded-xl border border-white shadow-sm p-4`}>
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${colour}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Add Staff Form ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-green-600" /> Add New Staff Member
        </h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Full name */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Sarah Chen"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.name ? 'border-red-300' : 'border-gray-200'}`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name}</p>}
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role *</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Employment type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Employment Type *</label>
            <select
              value={form.employmentType}
              onChange={e => setForm(f => ({ ...f, employmentType: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone (04XX XXX XXX)</label>
            <input
              type="text"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="0411 222 333"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.phone ? 'border-red-300' : 'border-gray-200'}`}
            />
            {errors.phone && <p className="text-xs text-red-500 mt-0.5">{errors.phone}</p>}
          </div>

          {/* Email */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="name@facility.com.au"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.email ? 'border-red-300' : 'border-gray-200'}`}
            />
            {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email}</p>}
          </div>

          {/* Submit */}
          <div className="lg:col-span-5 flex">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-[#22c55e] text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Adding…</span>
              ) : success ? (
                <span className="flex items-center gap-1.5"><Check className="w-4 h-4" /> Staff Member Added!</span>
              ) : (
                <span className="flex items-center gap-1.5"><UserCheck className="w-4 h-4" /> Add Staff Member</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Filter buttons ── */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              filter === f
                ? 'bg-[#1e293b] text-white border-[#1e293b]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {f} {f !== 'All' && <span className="ml-1 opacity-70">({counts[f.toLowerCase()]})</span>}
          </button>
        ))}
      </div>

      {/* ── Staff Table ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Name','Role','Type','Phone','Email','Status','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-gray-400 py-12 text-sm">
                    No staff found.
                  </td>
                </tr>
              ) : filtered.map(s => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  {editId === s.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="border border-gray-200 rounded px-2 py-1 text-xs w-36" />
                      </td>
                      <td className="px-4 py-2">
                        <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} className="border border-gray-200 rounded px-2 py-1 text-xs bg-white">
                          {ROLES.map(r => <option key={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <select value={editForm.employmentType} onChange={e => setEditForm(f => ({ ...f, employmentType: e.target.value }))} className="border border-gray-200 rounded px-2 py-1 text-xs bg-white">
                          {TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="border border-gray-200 rounded px-2 py-1 text-xs w-32" placeholder="04XX XXX XXX" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="border border-gray-200 rounded px-2 py-1 text-xs w-44" />
                      </td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">Active</span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => saveEdit(s.id)} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditId(null)} className="p-1.5 bg-gray-100 text-gray-500 rounded hover:bg-gray-200 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${roleBadge(s.role)}`}>{s.role}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeBadge(s.employmentType)}`}>{s.employmentType}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{s.phone || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{s.email || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(s)} className="p-1.5 bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition-colors" title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(s.id)} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
