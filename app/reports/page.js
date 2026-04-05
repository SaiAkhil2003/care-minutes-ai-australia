'use client';

import { useState, useMemo } from 'react';
import { FileText, Download, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { facility, manager, shiftsByDate, trendDates } from '@/lib/dummyData';
import { calculateDayCompliance, calculatePeriodCompliance, formatAUD, formatPct } from '@/lib/compliance';
import AuditPDF from './AuditPDF';

function toIso(ddmmyyyy) {
  const [d, m, y] = ddmmyyyy.split('/');
  return `${y}-${m}-${d}`;
}

function toDisplay(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function ReportsPage() {
  const [fromDate,  setFromDate]  = useState('01/01/2026');
  const [toDate,    setToDate]    = useState('02/04/2026');
  const [generated, setGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Filter trendDates to the selected range
  const filteredDates = useMemo(() => {
    if (!generated) return [];
    try {
      const from = toIso(fromDate);
      const to   = toIso(toDate);
      return trendDates.filter(d => d >= from && d <= to);
    } catch { return trendDates; }
  }, [generated, fromDate, toDate]);

  const periodData = useMemo(() => {
    if (!generated || filteredDates.length === 0) return null;
    const daily = filteredDates.map(date => ({ date, shifts: shiftsByDate[date] || [] }));
    return calculatePeriodCompliance(daily, facility.residentCount);
  }, [generated, filteredDates]);

  // Staff type breakdown
  const staffBreakdown = useMemo(() => {
    if (!periodData) return null;
    const allShifts = filteredDates.flatMap(d => shiftsByDate[d] || []);
    const byType = (type) => allShifts.filter(s => s.staffType === type).reduce((a, s) => a + s.durationMinutes, 0);
    const agency = allShifts.filter(s => s.employmentType === 'Agency').reduce((a, s) => a + s.durationMinutes, 0);
    const perm   = allShifts.filter(s => s.employmentType !== 'Agency').reduce((a, s) => a + s.durationMinutes, 0);
    const total  = allShifts.reduce((a, s) => a + s.durationMinutes, 0);
    return {
      rn:      byType('RN'),
      en:      byType('EN'),
      pcw:     byType('PCW'),
      agency,
      permanent: perm,
      agencyPct: total > 0 ? agency / total : 0,
      permPct:   total > 0 ? perm   / total : 0,
    };
  }, [periodData, filteredDates]);

  const overallResult = periodData
    ? periodData.overallCompliancePct >= 1 ? 'Met' : 'Not Met'
    : null;

  function handleGenerate(e) {
    e.preventDefault();
    setGenerating(true);
    setTimeout(() => {
      setGenerated(true);
      setGenerating(false);
    }, 800);
  }

  async function handleDownload() {
    if (!periodData || !staffBreakdown) return;
    setDownloading(true);
    try {
      const blob = await pdf(
        <AuditPDF
          facility={facility}
          manager={manager}
          fromDate={fromDate}
          toDate={toDate}
          periodData={periodData}
          staffBreakdown={staffBreakdown}
          filteredDates={filteredDates}
          shiftsByDate={shiftsByDate}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href = url;
      a.download = `CareMinutes_AuditReport_${fromDate.replace(/\//g,'-')}_${toDate.replace(/\//g,'-')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation error:', err);
    }
    setDownloading(false);
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Compliance Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Generate ACQSC audit reports for any date range</p>
      </div>

      {/* ── Report Generator ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" /> ACQSC Audit Report
        </h2>
        <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1 sm:flex-none">
            <label className="block text-xs font-medium text-gray-600 mb-1">From (DD/MM/YYYY)</label>
            <input
              type="text"
              value={fromDate}
              onChange={e => { setFromDate(e.target.value); setGenerated(false); }}
              placeholder="01/01/2026"
              className="w-full sm:w-36 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1 sm:flex-none">
            <label className="block text-xs font-medium text-gray-600 mb-1">To (DD/MM/YYYY)</label>
            <input
              type="text"
              value={toDate}
              onChange={e => { setToDate(e.target.value); setGenerated(false); }}
              placeholder="02/04/2026"
              className="w-full sm:w-36 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={generating}
            className="flex items-center justify-center gap-2 px-5 py-2 bg-[#1e293b] text-white rounded-lg text-sm font-semibold hover:bg-slate-700 active:bg-slate-800 transition-colors disabled:opacity-60 w-full sm:w-auto"
          >
            {generating
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating…</>
              : <><FileText className="w-4 h-4" /> Generate Report</>
            }
          </button>
          {generated && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center justify-center gap-2 px-5 py-2 bg-[#22c55e] text-white rounded-lg text-sm font-semibold hover:bg-green-600 active:bg-green-700 transition-colors disabled:opacity-60 w-full sm:w-auto"
            >
              {downloading
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Preparing PDF…</>
                : <><Download className="w-4 h-4" /> Download PDF</>
              }
            </button>
          )}
        </form>
      </div>

      {/* ── Report Preview ── */}
      {generated && periodData && staffBreakdown && (
        <div className="space-y-6">

          {/* Cover info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-8 rounded bg-[#1e293b]" />
                  <div>
                    <h2 className="font-bold text-gray-900 text-lg">{facility.name}</h2>
                    <p className="text-xs text-gray-500">ABN: {facility.abn}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  <span className="font-medium">Reporting period:</span> {fromDate} — {toDate}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Generated:</span> {toDisplay('2026-04-02')} 09:14 AEST
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Prepared by:</span> {manager.name}
                </p>
              </div>
              <div className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-base self-start ${
                overallResult === 'Met' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {overallResult === 'Met'
                  ? <><CheckCircle className="w-5 h-5" /> Compliance Met</>
                  : <><XCircle className="w-5 h-5" /> Compliance Not Met</>
                }
              </div>
            </div>
          </div>

          {/* Summary statistics */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Executive Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Total Days',           value: periodData.totalDays,                       unit: 'days'  },
                { label: 'Compliant Days',        value: periodData.compliantDays,                   unit: 'days', colour: 'text-green-600' },
                { label: 'Non-Compliant Days',    value: periodData.nonCompliantDays,                unit: 'days', colour: 'text-red-600'   },
                { label: 'Overall Compliance',    value: formatPct(periodData.overallCompliancePct), colour: periodData.overallCompliancePct >= 1 ? 'text-green-600' : 'text-red-600' },
                { label: 'Avg Daily Minutes',     value: `${Math.round(periodData.averageDailyMinutes).toLocaleString()} min` },
                { label: 'Total Penalties',       value: formatAUD(periodData.totalPenalty), colour: periodData.totalPenalty > 0 ? 'text-red-600' : 'text-green-600' },
              ].map(({ label, value, unit, colour }) => (
                <div key={label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className={`text-lg font-bold mt-0.5 ${colour || 'text-gray-900'}`}>
                    {value}{unit ? <span className="text-xs font-normal text-gray-500 ml-1">{unit}</span> : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Staff Type Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Staff Type Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {[
                { label: 'RN Minutes',     value: staffBreakdown.rn,  colour: 'text-blue-600',   bg: 'bg-blue-50'   },
                { label: 'EN Minutes',     value: staffBreakdown.en,  colour: 'text-purple-600', bg: 'bg-purple-50' },
                { label: 'PCW Minutes',    value: staffBreakdown.pcw, colour: 'text-green-600',  bg: 'bg-green-50'  },
                { label: 'Agency Minutes', value: staffBreakdown.agency, colour: 'text-amber-600', bg: 'bg-amber-50' },
              ].map(({ label, value, colour, bg }) => (
                <div key={label} className={`${bg} rounded-lg p-3`}>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className={`text-xl font-bold ${colour} mt-0.5`}>{value.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{Math.floor(value/60)}h {value%60}m</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100 text-sm">
              <div className="flex-1 bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Agency vs Permanent Split</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div className="h-2 bg-amber-400 rounded-l-full" style={{ width: `${staffBreakdown.agencyPct * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
                    {formatPct(staffBreakdown.agencyPct)} agency / {formatPct(staffBreakdown.permPct)} permanent
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Daily Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Date','Total Minutes','Target','Compliance','RN Minutes','RN Target','RN %','Status','Penalty'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periodData.days.map((day, idx) => (
                    <tr key={day.date} className={`border-b border-gray-50 hover:bg-green-50/20 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{toDisplay(day.date)}</td>
                      <td className="px-4 py-3 text-gray-700">{day.totalMinutes.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-500">{day.targetMinutes.toLocaleString()}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: day.ragStatus === 'GREEN' ? '#22c55e' : day.ragStatus === 'AMBER' ? '#f59e0b' : '#ef4444' }}>
                        {formatPct(day.compliancePct)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{day.rnMinutes.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-500">{day.rnTargetMinutes.toLocaleString()}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: day.rnRagStatus === 'GREEN' ? '#22c55e' : day.rnRagStatus === 'AMBER' ? '#f59e0b' : '#ef4444' }}>
                        {formatPct(day.rnCompliancePct)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          day.ragStatus === 'GREEN' ? 'bg-green-100 text-green-700' :
                          day.ragStatus === 'AMBER' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>{day.ragStatus}</span>
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: day.penaltyAmount > 0 ? '#ef4444' : '#6b7280' }}>
                        {day.penaltyAmount > 0 ? formatAUD(day.penaltyAmount) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Empty state */}
      {!generated && (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No report generated yet</p>
          <p className="text-sm text-gray-400 mt-1">Select a date range and click Generate Report</p>
        </div>
      )}
    </div>
  );
}
