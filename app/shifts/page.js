'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Download, Upload, Pencil, Trash2, ClipboardList, X, Check, Database, RefreshCw } from 'lucide-react';
import { shifts as dummyShifts, staff as dummyStaff, facility } from '@/lib/dummyData';
import { calculateDayCompliance, formatAUD } from '@/lib/compliance';
import { getShifts, addShift, updateShift, deleteShift, getStaff, logShiftHistory, mapShift, mapStaff } from '@/lib/db';
import { SEED_FACILITY_ID } from '@/lib/seedData';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toIso(ddmmyyyy) {
  const [d, m, y] = ddmmyyyy.split('/');
  return `${y}-${m}-${d}`;
}

function toDisplay(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function calcDuration(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  return mins > 0 ? mins : 0;
}

function fmtMins(m) {
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function getWeek(isoDate) {
  const d = new Date(isoDate);
  const day = d.getDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

const THIS_WEEK = getWeek('2026-04-02');

const CSV_TEMPLATE = `Date (DD/MM/YYYY),Staff Name,Role,Start Time (HH:MM),End Time (HH:MM)
02/04/2026,Sarah Chen,RN,07:00,15:00
02/04/2026,Jennifer Walsh,EN,07:00,15:00
02/04/2026,David Kim,PCW,15:00,23:00
`;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShiftsPage() {
  // Data state — starts with dummy, replaced by DB on load
  const [shifts, setShifts]   = useState(dummyShifts);
  const [staff, setStaff]     = useState(dummyStaff);
  const [usingDb, setUsingDb] = useState(false);
  const [dbLoading, setDbLoading] = useState(true);

  const [form, setForm]         = useState({ staffId: '', date: '02/04/2026', startTime: '', endTime: '' });
  const [editId, setEditId]     = useState(null);
  const [editForm, setEditForm] = useState({});
  const [auditId, setAuditId]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);

  // ── Load from Supabase ──────────────────────────────────────────────────────
  const loadFromDb = useCallback(async () => {
    setDbLoading(true);
    try {
      const [shiftsRes, staffRes] = await Promise.all([
        getShifts(SEED_FACILITY_ID),
        getStaff(SEED_FACILITY_ID),
      ]);

      const dbOk = !shiftsRes.error && shiftsRes.data.length > 0 &&
                   !staffRes.error  && staffRes.data.length  > 0;

      if (dbOk) {
        setShifts(shiftsRes.data.map(mapShift));
        setStaff(staffRes.data.map(mapStaff));
        setUsingDb(true);
      }
    } catch {
      // keep dummy data
    } finally {
      setDbLoading(false);
    }
  }, []);

  useEffect(() => { loadFromDb(); }, [loadFromDb]);

  const selectedStaff = staff.find(s => s.id === form.staffId);
  const duration      = calcDuration(form.startTime, form.endTime);

  // This week's minutes
  const weekShifts = useMemo(() => shifts.filter(s => getWeek(s.date) === THIS_WEEK), [shifts]);
  const weekMinutes = weekShifts.reduce((a, s) => a + s.durationMinutes, 0);
  const weekTarget  = facility.residentCount * 215 * 7;

  // Sorted shifts (newest first)
  const sortedShifts = useMemo(() =>
    [...shifts].sort((a, b) => b.date.localeCompare(a.date) || a.startTime.localeCompare(b.startTime)),
  [shifts]);

  // ── Add shift ───────────────────────────────────────────────────────────────
  async function handleAdd(e) {
    e.preventDefault();
    if (!selectedStaff || !form.startTime || !form.endTime || duration <= 0) return;
    setLoading(true);

    const isoDate = toIso(form.date);
    const newShift = {
      staffId:         form.staffId,
      staffName:       selectedStaff.name,
      staffType:       selectedStaff.role,
      date:            isoDate,
      startTime:       form.startTime,
      endTime:         form.endTime,
      durationMinutes: duration,
      employmentType:  selectedStaff.employmentType,
    };

    if (usingDb) {
      const { data, error } = await addShift(SEED_FACILITY_ID, newShift);
      if (!error && data) {
        setShifts(prev => [...prev, mapShift(data)]);
      } else {
        // fall back: add locally with temp id
        setShifts(prev => [...prev, { id: `local-${Date.now()}`, ...newShift }]);
      }
    } else {
      setShifts(prev => [...prev, { id: `local-${Date.now()}`, ...newShift }]);
    }

    setForm({ staffId: '', date: '02/04/2026', startTime: '', endTime: '' });
    setLoading(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  }

  // ── Delete shift ────────────────────────────────────────────────────────────
  async function handleDelete(id) {
    if (usingDb) {
      await deleteShift(id);
    }
    setShifts(prev => prev.filter(s => s.id !== id));
  }

  // ── Start edit ──────────────────────────────────────────────────────────────
  function startEdit(shift) {
    setEditId(shift.id);
    setEditForm({ date: toDisplay(shift.date), startTime: shift.startTime, endTime: shift.endTime });
  }

  // ── Save edit ───────────────────────────────────────────────────────────────
  async function saveEdit(id) {
    const dur = calcDuration(editForm.startTime, editForm.endTime);
    const updates = {
      date:            toIso(editForm.date),
      startTime:       editForm.startTime,
      endTime:         editForm.endTime,
      durationMinutes: dur,
    };

    if (usingDb) {
      const oldShift = shifts.find(s => s.id === id);
      const { data, error } = await updateShift(id, updates);
      if (!error && data) {
        setShifts(prev => prev.map(s => s.id === id ? mapShift(data) : s));
        // Log history
        await logShiftHistory(id, SEED_FACILITY_ID, {
          changedBy: 'Jennifer Roberts',
          oldValues: oldShift,
          newValues: updates,
          reason:    'Manual edit via Shifts page',
        });
      } else {
        setShifts(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      }
    } else {
      setShifts(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    }
    setEditId(null);
  }

  // ── CSV export ──────────────────────────────────────────────────────────────
  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'careminutes_shift_template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  // ── CSV import ──────────────────────────────────────────────────────────────
  async function handleCSVImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const lines = ev.target.result.split('\n').slice(1);
      const newShifts = [];
      for (const line of lines) {
        const [dateStr, name, role, start, end] = line.split(',').map(s => s.trim());
        if (!dateStr || !name || !role || !start || !end) continue;
        const dur = calcDuration(start, end);
        if (dur <= 0) continue;
        const shiftData = {
          staffId: '', staffName: name, staffType: role.toUpperCase(),
          date: toIso(dateStr), startTime: start, endTime: end,
          durationMinutes: dur, employmentType: 'Permanent',
        };
        if (usingDb) {
          const { data } = await addShift(SEED_FACILITY_ID, shiftData);
          if (data) { newShifts.push(mapShift(data)); continue; }
        }
        newShifts.push({ id: `import-${Date.now()}-${Math.random()}`, ...shiftData });
      }
      if (newShifts.length > 0) setShifts(prev => [...prev, ...newShifts]);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  const auditShift = shifts.find(s => s.id === auditId);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">Shift Management</h1>
            {usingDb ? (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full border border-green-200">
                <Database className="w-3 h-3" /> Live DB
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
                Demo Data
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Add, edit and review care shifts</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={downloadTemplate} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors font-medium">
            <Download className="w-4 h-4" /> <span className="hidden sm:inline">CSV Template</span>
          </button>
          <label className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors font-medium cursor-pointer">
            <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Import CSV</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
          </label>
          {usingDb && (
            <button onClick={loadFromDb} disabled={dbLoading} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${dbLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* ── This Week Summary ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 card-hover">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">This Week</p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">
              {weekMinutes.toLocaleString()} / {weekTarget.toLocaleString()} minutes
            </p>
          </div>
          <div className="flex-1 sm:max-w-xs">
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min((weekMinutes / weekTarget) * 100, 100)}%`,
                  backgroundColor: weekMinutes >= weekTarget ? '#22c55e' : weekMinutes / weekTarget >= 0.85 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">{((weekMinutes / weekTarget) * 100).toFixed(1)}% of weekly target</p>
          </div>
        </div>
      </div>

      {/* ── Add Shift Form ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-green-600" /> Add New Shift
        </h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4">
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Staff Member</label>
            <select
              value={form.staffId}
              onChange={e => setForm(f => ({ ...f, staffId: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              required
            >
              <option value="">Select staff…</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
            <input type="text" value={selectedStaff ? selectedStaff.role : ''} readOnly placeholder="Auto-filled"
              className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date (DD/MM/YYYY)</label>
            <input type="text" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              placeholder="02/04/2026" pattern="\d{2}/\d{2}/\d{4}" required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
            <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
            <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
          <div className="sm:col-span-2 lg:col-span-6 flex flex-col sm:flex-row sm:items-end gap-3">
            {duration > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700 font-medium">
                Duration: {fmtMins(duration)} ({duration} min)
              </div>
            )}
            <button type="submit" disabled={loading}
              className="flex items-center justify-center gap-2 px-5 py-2 bg-[#22c55e] text-white rounded-lg text-sm font-semibold hover:bg-green-600 active:bg-green-700 transition-colors disabled:opacity-60 w-full sm:w-auto">
              {loading
                ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Adding…</>
                : success
                  ? <><Check className="w-4 h-4" /> Shift Added!</>
                  : <><Plus className="w-4 h-4" /> Add Shift</>}
            </button>
          </div>
        </form>
      </div>

      {/* ── Shifts Table ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 md:px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Shifts Log</h2>
          <p className="text-xs text-gray-400 mt-0.5">{shifts.length} shifts recorded</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Date','Staff Name','Role','Type','Start','End','Duration','Actions'].map(h => (
                  <th key={h} className="text-left px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedShifts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-gray-400 py-12 text-sm">No shifts recorded yet. Add a shift above.</td>
                </tr>
              ) : sortedShifts.map((shift, idx) => (
                <tr key={shift.id} className={`border-b border-gray-50 transition-colors hover:bg-green-50/30 ${idx % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  {editId === shift.id ? (
                    <>
                      <td className="px-3 md:px-4 py-2">
                        <input value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                          className="border border-gray-200 rounded px-2 py-1 text-xs w-24" />
                      </td>
                      <td className="px-3 md:px-4 py-2 text-gray-700 whitespace-nowrap">{shift.staffName}</td>
                      <td className="px-3 md:px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${shift.staffType === 'RN' ? 'bg-blue-100 text-blue-700' : shift.staffType === 'EN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>{shift.staffType}</span>
                      </td>
                      <td className="px-3 md:px-4 py-2 text-gray-500 text-xs">{shift.employmentType}</td>
                      <td className="px-3 md:px-4 py-2">
                        <input type="time" value={editForm.startTime} onChange={e => setEditForm(f => ({ ...f, startTime: e.target.value }))} className="border border-gray-200 rounded px-2 py-1 text-xs" />
                      </td>
                      <td className="px-3 md:px-4 py-2">
                        <input type="time" value={editForm.endTime} onChange={e => setEditForm(f => ({ ...f, endTime: e.target.value }))} className="border border-gray-200 rounded px-2 py-1 text-xs" />
                      </td>
                      <td className="px-3 md:px-4 py-2 text-xs text-gray-500">{fmtMins(calcDuration(editForm.startTime, editForm.endTime))}</td>
                      <td className="px-3 md:px-4 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => saveEdit(shift.id)} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setEditId(null)} className="p-1.5 bg-gray-100 text-gray-500 rounded hover:bg-gray-200 transition-colors"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 md:px-4 py-3 text-gray-700 whitespace-nowrap font-medium">{toDisplay(shift.date)}</td>
                      <td className="px-3 md:px-4 py-3 text-gray-700 whitespace-nowrap">{shift.staffName}</td>
                      <td className="px-3 md:px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${shift.staffType === 'RN' ? 'bg-blue-100 text-blue-700' : shift.staffType === 'EN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{shift.staffType}</span>
                      </td>
                      <td className="px-3 md:px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{shift.employmentType}</td>
                      <td className="px-3 md:px-4 py-3 text-gray-700">{shift.startTime}</td>
                      <td className="px-3 md:px-4 py-3 text-gray-700">{shift.endTime}</td>
                      <td className="px-3 md:px-4 py-3 text-gray-700 whitespace-nowrap">{fmtMins(shift.durationMinutes)}</td>
                      <td className="px-3 md:px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => setAuditId(shift.id)} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors" title="Audit trail"><ClipboardList className="w-3.5 h-3.5" /></button>
                          <button onClick={() => startEdit(shift)} className="p-1.5 bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(shift.id)} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
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

      {/* ── Audit Trail Modal ── */}
      {auditId && auditShift && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setAuditId(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 md:p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-blue-600" /> Audit Trail
              </h3>
              <button onClick={() => setAuditId(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                {[
                  ['Shift ID',  auditShift.id],
                  ['Staff',     auditShift.staffName],
                  ['Role',      auditShift.staffType],
                  ['Date',      toDisplay(auditShift.date)],
                  ['Time',      `${auditShift.startTime} – ${auditShift.endTime}`],
                  ['Duration',  `${auditShift.durationMinutes} minutes`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-gray-500 shrink-0">{label}</span>
                    <span className="font-medium text-gray-900 truncate text-right">{value}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 text-xs text-gray-500">
                <p className="font-semibold text-gray-700 text-sm">Audit Log</p>
                <div className="border-l-2 border-gray-200 pl-3 space-y-1.5">
                  <p><span className="font-medium text-gray-700">Created</span> — 02/04/2026 07:15 AEST by Jennifer Roberts</p>
                  <p><span className="font-medium text-gray-700">Submitted</span> — Auto-logged from roster system</p>
                  <p><span className="font-medium text-gray-700">Verified</span> — Included in ACQSC compliance report</p>
                  {usingDb && <p><span className="font-medium text-gray-700">Storage</span> — Saved to Supabase database</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
