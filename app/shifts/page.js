'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Download, Upload, Pencil, Trash2, ClipboardList, X, Check, Database, RefreshCw, Filter, Save, ChevronDown } from 'lucide-react';
import { shifts as dummyShifts, staff as dummyStaff, facility, shiftTemplates as dummyTemplates } from '@/lib/dummyData';
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

// ─── Date filter ranges (relative to TODAY = 2026-04-07, a Tuesday) ───────────
// Mon of this week: Apr 7 − 1 = Apr 6  |  Sun: Apr 12
// Mon of last week: Mar 30              |  Sun: Apr 5
// This month: Apr 1 – Apr 30

const DATE_FILTERS = ['Today', 'This Week', 'Last Week', 'This Month', 'Custom'];
const DEFAULT_FILTER = 'This Week';

const FILTER_RANGES = {
  'Today':      { from: '2026-04-07', to: '2026-04-07' },
  'This Week':  { from: '2026-04-06', to: '2026-04-12' },
  'Last Week':  { from: '2026-03-30', to: '2026-04-05' },
  'This Month': { from: '2026-04-01', to: '2026-04-30' },
};

const THIS_WEEK = getWeek('2026-04-07');

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

  const [form, setForm]         = useState({ staffId: '', date: '07/04/2026', startTime: '', endTime: '' });
  const [editId, setEditId]     = useState(null);
  const [editForm, setEditForm] = useState({});
  const [auditId, setAuditId]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);

  // ── Date filter state ────────────────────────────────────────────────────────
  const [activeFilter, setActiveFilter]   = useState(DEFAULT_FILTER);
  const [customFrom, setCustomFrom]       = useState('');
  const [customTo, setCustomTo]           = useState('');
  const [showCustom, setShowCustom]       = useState(false);

  // ── Template state (Feature 3) ───────────────────────────────────────────────
  const [templates, setTemplates]           = useState(() => {
    if (typeof window === 'undefined') return dummyTemplates;
    try { return JSON.parse(localStorage.getItem('cm_shiftTemplates') || 'null') || dummyTemplates; }
    catch { return dummyTemplates; }
  });
  const [showSaveModal, setShowSaveModal]   = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [templateName, setTemplateName]     = useState('');
  const [templateDesc, setTemplateDesc]     = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [applyWeekStart, setApplyWeekStart] = useState('');
  const [templateSaved, setTemplateSaved]   = useState(false);
  const [templateApplied, setTemplateApplied] = useState(false);

  function saveTemplates(updated) {
    setTemplates(updated);
    try { localStorage.setItem('cm_shiftTemplates', JSON.stringify(updated)); } catch {}
  }

  // Get this-week's Monday (ISO)
  function getThisMonday() {
    const d = new Date('2026-04-07T00:00:00');
    const dow = d.getDay() || 7;
    d.setDate(d.getDate() - (dow - 1));
    return d.toISOString().split('T')[0];
  }

  function handleSaveTemplate() {
    if (!templateName.trim()) return;
    // Build template from current week's shifts
    const weekFrom = FILTER_RANGES['This Week'].from;
    const weekTo   = FILTER_RANGES['This Week'].to;
    const weekShiftsRaw = shifts.filter(s => s.date >= weekFrom && s.date <= weekTo);
    const templateShifts = weekShiftsRaw.map(s => {
      const d = new Date(s.date + 'T00:00:00');
      const dow = d.getDay() || 7; // 1=Mon, 7=Sun
      return {
        staffId: s.staffId, staffName: s.staffName, staffType: s.staffType,
        employmentType: s.employmentType, dayOfWeek: dow,
        startTime: s.startTime, endTime: s.endTime, durationMinutes: s.durationMinutes,
      };
    });
    const newTemplate = {
      id: `template-${Date.now()}`,
      name: templateName.trim(),
      description: templateDesc.trim(),
      createdAt: '2026-04-07',
      shifts: templateShifts,
    };
    saveTemplates([...templates, newTemplate]);
    setTemplateName('');
    setTemplateDesc('');
    setTemplateSaved(true);
    setTimeout(() => { setShowSaveModal(false); setTemplateSaved(false); }, 1500);
  }

  function handleApplyTemplate() {
    const tmpl = templates.find(t => t.id === selectedTemplate);
    if (!tmpl || !applyWeekStart) return;
    const mondayDate = new Date(applyWeekStart + 'T00:00:00');
    const newShifts = [];
    for (const ts of tmpl.shifts) {
      const dayOffset = ts.dayOfWeek - 1; // Mon=0, Sun=6
      const shiftDate = new Date(mondayDate);
      shiftDate.setDate(mondayDate.getDate() + dayOffset);
      const isoDate = shiftDate.toISOString().split('T')[0];
      // Skip if shift already exists for this staff on this date
      const exists = shifts.some(
        s => s.date === isoDate && s.staffId === ts.staffId &&
             s.startTime === ts.startTime && s.endTime === ts.endTime
      );
      if (!exists) {
        newShifts.push({
          id: `local-tmpl-${Date.now()}-${Math.random()}`,
          date: isoDate,
          staffId: ts.staffId, staffName: ts.staffName,
          staffType: ts.staffType, employmentType: ts.employmentType,
          startTime: ts.startTime, endTime: ts.endTime,
          durationMinutes: ts.durationMinutes,
        });
      }
    }
    if (newShifts.length > 0) setShifts(prev => [...prev, ...newShifts]);
    setTemplateApplied(true);
    setTimeout(() => { setShowApplyModal(false); setTemplateApplied(false); setSelectedTemplate(''); setApplyWeekStart(''); }, 1500);
  }

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

  // ── Filtered shifts based on active date filter ─────────────────────────────
  const filteredShifts = useMemo(() => {
    let from, to;
    if (activeFilter === 'Custom') {
      from = customFrom;
      to   = customTo;
    } else if (FILTER_RANGES[activeFilter]) {
      from = FILTER_RANGES[activeFilter].from;
      to   = FILTER_RANGES[activeFilter].to;
    }
    if (!from || !to) return shifts;
    return shifts.filter(s => s.date >= from && s.date <= to);
  }, [shifts, activeFilter, customFrom, customTo]);

  const filteredMinutes = filteredShifts.reduce((a, s) => a + s.durationMinutes, 0);

  // Determine the label for the summary bar
  const filterLabel = activeFilter === 'Custom'
    ? (customFrom && customTo ? `${toDisplay(customFrom)} – ${toDisplay(customTo)}` : 'Custom')
    : activeFilter;

  // Days in period for target calculation
  const filterDayCount = useMemo(() => {
    let from, to;
    if (activeFilter === 'Custom') { from = customFrom; to = customTo; }
    else if (FILTER_RANGES[activeFilter]) { from = FILTER_RANGES[activeFilter].from; to = FILTER_RANGES[activeFilter].to; }
    if (!from || !to) return 7;
    const diff = Math.round((new Date(to) - new Date(from)) / 86400000) + 1;
    return Math.max(1, diff);
  }, [activeFilter, customFrom, customTo]);

  const periodTarget = facility.residentCount * 215 * filterDayCount;

  // This week totals (kept for reference)
  const weekShifts = useMemo(() => shifts.filter(s => getWeek(s.date) === THIS_WEEK), [shifts]);
  const weekMinutes = weekShifts.reduce((a, s) => a + s.durationMinutes, 0);
  const weekTarget  = facility.residentCount * 215 * 7;

  // Sorted filtered shifts (newest first)
  const sortedShifts = useMemo(() =>
    [...filteredShifts].sort((a, b) => b.date.localeCompare(a.date) || a.startTime.localeCompare(b.startTime)),
  [filteredShifts]);

  function handleFilterSelect(f) {
    setActiveFilter(f);
    if (f === 'Custom') { setShowCustom(true); }
    else { setShowCustom(false); }
  }

  function clearFilter() {
    setActiveFilter(DEFAULT_FILTER);
    setShowCustom(false);
    setCustomFrom('');
    setCustomTo('');
  }

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

    setForm({ staffId: '', date: '07/04/2026', startTime: '', endTime: '' });
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
          {/* Template buttons (Feature 3) */}
          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-green-300 rounded-lg text-green-700 hover:bg-green-50 transition-colors font-medium"
          >
            <Save className="w-4 h-4" /> <span className="hidden sm:inline">Save as Template</span>
          </button>
          <button
            onClick={() => { setShowApplyModal(true); setApplyWeekStart(getThisMonday()); }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-blue-300 rounded-lg text-blue-700 hover:bg-blue-50 transition-colors font-medium"
          >
            <ClipboardList className="w-4 h-4" /> <span className="hidden sm:inline">Apply Template</span>
          </button>
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

      {/* ── Date Filter Bar ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 card-hover">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            {/* Desktop: button group */}
            <div className="hidden sm:flex gap-1 flex-wrap">
              {DATE_FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => handleFilterSelect(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                    activeFilter === f
                      ? 'bg-[#22c55e] text-white border-[#22c55e]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-green-300 hover:bg-green-50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            {/* Mobile: dropdown */}
            <select
              className="sm:hidden border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              value={activeFilter}
              onChange={e => handleFilterSelect(e.target.value)}
            >
              {DATE_FILTERS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            {/* Active filter badge */}
            {activeFilter !== DEFAULT_FILTER && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full border border-green-200">
                Showing: {filterLabel}
                <button onClick={clearFilter} className="ml-1 hover:text-green-600 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
          {/* Custom date range pickers */}
          {showCustom && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label className="text-xs text-gray-500 shrink-0">From</label>
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <label className="text-xs text-gray-500 shrink-0">To</label>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Period Summary ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 card-hover">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{filterLabel}</p>
            <p className="text-lg font-bold text-gray-900 mt-0.5">
              {filteredMinutes.toLocaleString()} / {periodTarget.toLocaleString()} minutes
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{filteredShifts.length} shift{filteredShifts.length !== 1 ? 's' : ''} in period</p>
          </div>
          <div className="flex-1 sm:max-w-xs">
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min((filteredMinutes / periodTarget) * 100, 100)}%`,
                  backgroundColor: filteredMinutes >= periodTarget ? '#22c55e' : filteredMinutes / periodTarget >= 0.85 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">{((filteredMinutes / periodTarget) * 100).toFixed(1)}% of {filterLabel.toLowerCase()} target</p>
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
          <p className="text-xs text-gray-400 mt-0.5">
            {filteredShifts.length} of {shifts.length} shifts · {filterLabel}
          </p>
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

      {/* ══════════════════════════════════════════════════════════════════════════
          SAVE TEMPLATE MODAL (Feature 3)
      ══════════════════════════════════════════════════════════════════════════ */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowSaveModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Save className="w-4 h-4 text-green-600" /> Save This Week as Template
              </h2>
              <button onClick={() => setShowSaveModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Template Name *</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  placeholder="e.g. Standard Week, Holiday Cover"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={templateDesc}
                  onChange={e => setTemplateDesc(e.target.value)}
                  placeholder="Brief description of this template"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-600 mb-1.5">Preview — This Week's Shifts</p>
                {shifts.filter(s => s.date >= FILTER_RANGES['This Week'].from && s.date <= FILTER_RANGES['This Week'].to).length === 0 ? (
                  <p className="text-xs text-gray-400">No shifts found for this week.</p>
                ) : (
                  <p className="text-xs text-gray-600">
                    {shifts.filter(s => s.date >= FILTER_RANGES['This Week'].from && s.date <= FILTER_RANGES['This Week'].to).length} shifts ·{' '}
                    {shifts.filter(s => s.date >= FILTER_RANGES['This Week'].from && s.date <= FILTER_RANGES['This Week'].to && s.staffType === 'RN').length} RN shifts
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3 p-5 pt-0">
              <button onClick={() => setShowSaveModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={!templateName.trim() || templateSaved}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#22c55e] text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-60"
              >
                {templateSaved ? <><Check className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Template</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          APPLY TEMPLATE MODAL (Feature 3)
      ══════════════════════════════════════════════════════════════════════════ */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowApplyModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-blue-600" /> Apply Template to Week
              </h2>
              <button onClick={() => setShowApplyModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Select Template</label>
                <select
                  value={selectedTemplate}
                  onChange={e => setSelectedTemplate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="">— Choose a template —</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.shifts?.length || 0} shifts)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Apply to week starting (Monday)</label>
                <input
                  type="date"
                  value={applyWeekStart}
                  onChange={e => setApplyWeekStart(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              {selectedTemplate && applyWeekStart && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs font-medium text-blue-700 mb-1">Preview</p>
                  <p className="text-xs text-blue-600">
                    {(() => {
                      const tmpl = templates.find(t => t.id === selectedTemplate);
                      if (!tmpl) return null;
                      const newShifts = tmpl.shifts.filter(ts => {
                        const mondayDate = new Date(applyWeekStart + 'T00:00:00');
                        const shiftDate = new Date(mondayDate);
                        shiftDate.setDate(mondayDate.getDate() + ts.dayOfWeek - 1);
                        const isoDate = shiftDate.toISOString().split('T')[0];
                        return !shifts.some(
                          s => s.date === isoDate && s.staffId === ts.staffId &&
                               s.startTime === ts.startTime && s.endTime === ts.endTime
                        );
                      }).length;
                      return `${newShifts} new shifts will be added · ${tmpl.shifts.length - newShifts} already exist (skipped)`;
                    })()}
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 pt-0">
              <button onClick={() => setShowApplyModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleApplyTemplate}
                disabled={!selectedTemplate || !applyWeekStart || templateApplied}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {templateApplied ? <><Check className="w-4 h-4" /> Applied!</> : <><ClipboardList className="w-4 h-4" /> Apply Template</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
