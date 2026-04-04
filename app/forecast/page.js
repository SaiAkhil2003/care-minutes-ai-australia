'use client';

import { useState, useMemo } from 'react';
import {
  RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer,
  Tooltip, Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { facility, shiftsByDate, trendDates } from '@/lib/dummyData';
import {
  calculatePeriodCompliance,
  projectQuarterPenalty,
  calculateRecoveryPlan,
  calculateWhatIfScenario,
  formatAUD,
  formatPct,
  PENALTY_PER_RESIDENT_PER_DAY,
} from '@/lib/compliance';

// ─── Q2 2026: 01 Apr – 30 Jun (91 days) ──────────────────────────────────────
// Days elapsed so far (data available): 2 days (01 Apr & 02 Apr in our dataset)
// Q2 starts 01 Apr 2026, today = 02 Apr 2026

const Q2_TOTAL_DAYS    = 91;  // Apr (30) + May (31) + Jun (30)
const Q2_ELAPSED       = 2;   // 01 Apr + 02 Apr
const Q2_REMAINING     = Q2_TOTAL_DAYS - Q2_ELAPSED;
const Q2_START         = '2026-04-01';
const Q2_END           = '2026-06-30';

// Data for Q2 days in our dataset
const Q2_DATES = trendDates.filter(d => d >= Q2_START);

function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Gauge colour based on compliance
function gaugeColour(pct) {
  if (pct >= 1)    return '#22c55e';
  if (pct >= 0.85) return '#f59e0b';
  return '#ef4444';
}

// Custom gauge tooltip
function GaugeTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow p-2 text-xs">
      <p className="font-semibold">{payload[0]?.value?.toFixed(1)}%</p>
    </div>
  );
}

export default function ForecastPage() {
  const [extraShifts, setExtraShifts] = useState(3);

  // Q2 compliance data (only 2 days so far)
  const q2DailyData = useMemo(() =>
    Q2_DATES.map(date => ({ date, shifts: shiftsByDate[date] || [] })),
  []);

  const q2Period = useMemo(() =>
    calculatePeriodCompliance(q2DailyData, facility.residentCount),
  [q2DailyData]);

  // Quarter penalty projection
  const projection = useMemo(() =>
    projectQuarterPenalty(q2Period, facility.residentCount, Q2_REMAINING),
  [q2Period]);

  // Recovery plan
  const totalMinutesSoFar = q2Period.days.reduce((a, d) => a + d.totalMinutes, 0);
  const recovery = useMemo(() =>
    calculateRecoveryPlan(totalMinutesSoFar, facility.residentCount, Q2_ELAPSED, Q2_REMAINING),
  [totalMinutesSoFar]);

  // What-if scenario
  const whatIf = useMemo(() =>
    calculateWhatIfScenario(
      extraShifts, 480, Q2_REMAINING, facility.residentCount,
      q2Period.nonCompliantDays, totalMinutesSoFar, Q2_ELAPSED,
    ),
  [extraShifts, q2Period.nonCompliantDays, totalMinutesSoFar]);

  // Gauge data (0-100%)
  const compliancePct = q2Period.overallCompliancePct;
  const gaugeValue    = Math.min(compliancePct * 100, 100);
  const gaugeData     = [{ name: 'Compliance', value: gaugeValue, fill: gaugeColour(compliancePct) }];

  // Penalty breakdown table rows
  const penaltyRows = q2Period.days.filter(d => !d.isCompliant).map(d => ({
    date:       formatDate(d.date),
    status:     d.ragStatus,
    residents:  facility.residentCount,
    penaltyDay: PENALTY_PER_RESIDENT_PER_DAY,
    total:      d.penaltyAmount,
  }));

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Quarterly Forecast</h1>
        <p className="text-sm text-gray-500 mt-0.5">Q2 2026 — April to June · {formatDate(Q2_START)} – {formatDate(Q2_END)}</p>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quarter Compliance</p>
          <p className={`text-2xl font-bold mt-1 ${compliancePct >= 1 ? 'text-green-600' : compliancePct >= 0.85 ? 'text-amber-600' : 'text-red-600'}`}>
            {formatPct(compliancePct)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{Q2_ELAPSED} days so far</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Days Remaining</p>
          <p className="text-2xl font-bold mt-1 text-gray-900">{Q2_REMAINING}</p>
          <p className="text-xs text-gray-400 mt-0.5">of {Q2_TOTAL_DAYS} days this quarter</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Penalty Accrued</p>
          <p className={`text-2xl font-bold mt-1 ${q2Period.totalPenalty > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatAUD(q2Period.totalPenalty)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{q2Period.nonCompliantDays} non-compliant days</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Projected Penalty</p>
          <p className={`text-2xl font-bold mt-1 ${projection.projectedTotalPenalty > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatAUD(projection.projectedTotalPenalty)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">at current pace</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Left: Gauge + Penalty Table ── */}
        <div className="xl:col-span-2 space-y-6">

          {/* Compliance Gauge */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-2">Q2 Compliance Gauge</h2>
            <p className="text-xs text-gray-400 mb-4">Based on {Q2_ELAPSED} days of data — updates daily</p>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-48 h-48 relative flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%" cy="50%"
                    innerRadius="65%" outerRadius="85%"
                    startAngle={180} endAngle={-180}
                    data={gaugeData}
                    barSize={18}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar
                      background={{ fill: '#f1f5f9' }}
                      dataKey="value"
                      angleAxisId={0}
                      cornerRadius={6}
                    >
                      {gaugeData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </RadialBar>
                    <Tooltip content={<GaugeTooltip />} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold" style={{ color: gaugeColour(compliancePct) }}>
                    {gaugeValue.toFixed(0)}%
                  </span>
                  <span className="text-xs text-gray-400 mt-0.5">compliant</span>
                </div>
              </div>
              <div className="flex-1 space-y-3 w-full">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-[#22c55e] shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Compliant days</p>
                    <p className="font-semibold text-gray-900">{q2Period.compliantDays} / {Q2_ELAPSED} days ({formatPct(compliancePct)})</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-[#ef4444] shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Non-compliant days</p>
                    <p className="font-semibold text-gray-900">{q2Period.nonCompliantDays} days so far</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-[#f59e0b] shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Projected non-compliant</p>
                    <p className="font-semibold text-gray-900">
                      ~{Math.round(projection.nonComplianceRate * Q2_TOTAL_DAYS)} days for full quarter
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Penalty Breakdown Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Penalty Breakdown</h2>
              <p className="text-xs text-gray-400 mt-0.5">Non-compliant days in Q2 2026 so far</p>
            </div>
            {penaltyRows.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500 font-medium">No penalties recorded this quarter</p>
                <p className="text-xs text-gray-400 mt-1">All days compliant so far</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['Date','Status','Residents','Penalty/Resident/Day','Total Penalty'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {penaltyRows.map((row, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-medium text-gray-900">{row.date}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            row.status === 'RED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>{row.status}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{row.residents}</td>
                        <td className="px-4 py-3 text-gray-700">{formatAUD(row.penaltyDay)}</td>
                        <td className="px-4 py-3 font-semibold text-red-600">{formatAUD(row.total)}</td>
                      </tr>
                    ))}
                    <tr className="bg-red-50">
                      <td colSpan={4} className="px-4 py-3 font-semibold text-gray-700">Total Penalties (Q2 so far)</td>
                      <td className="px-4 py-3 font-bold text-red-700">{formatAUD(q2Period.totalPenalty)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Recovery Plan + What If ── */}
        <div className="space-y-6">

          {/* Recovery Plan */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              {recovery.isOnTrack
                ? <CheckCircle className="w-4 h-4 text-green-600" />
                : <AlertTriangle className="w-4 h-4 text-amber-600" />
              }
              <h2 className="font-semibold text-gray-900">Recovery Plan</h2>
            </div>
            {recovery.isOnTrack ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700 font-medium">You are on track for Q2 2026! 🎉</p>
                <p className="text-xs text-green-600 mt-1">Continue current staffing levels to maintain compliance.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800 font-semibold">
                    {Math.round(recovery.additionalMinutesPerDay).toLocaleString()} additional minutes/day needed
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    for the remaining {Q2_REMAINING} days to meet Q2 target.
                  </p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Q2 total target</span>
                    <span className="font-medium text-gray-900">{recovery.targetTotalMinutes.toLocaleString()} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Minutes delivered</span>
                    <span className="font-medium text-gray-900">{totalMinutesSoFar.toLocaleString()} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Shortfall</span>
                    <span className="font-semibold text-red-600">{recovery.shortfallMinutes.toLocaleString()} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Extra shifts needed</span>
                    <span className="font-semibold text-amber-600">
                      ~{Math.ceil(recovery.additionalMinutesPerDay / 480)} shifts/day
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* What If Scenario */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-1">What If Scenario</h2>
            <p className="text-xs text-gray-400 mb-4">Slide to see impact of adding extra RN shifts</p>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700">Extra RN shifts per week</label>
                <span className="text-lg font-bold text-[#22c55e]">{extraShifts}</span>
              </div>
              <input
                type="range"
                min={1} max={10} step={1}
                value={extraShifts}
                onChange={e => setExtraShifts(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#22c55e]"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1 shift</span>
                <span>10 shifts</span>
              </div>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500">Additional minutes/week</span>
                <span className="font-semibold text-gray-900">{whatIf.additionalMinutesPerWeek.toLocaleString()} min</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500">Projected compliance</span>
                <span className={`font-bold ${whatIf.projectedCompliancePct >= 1 ? 'text-green-600' : whatIf.projectedCompliancePct >= 0.85 ? 'text-amber-600' : 'text-red-600'}`}>
                  {formatPct(whatIf.projectedCompliancePct)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-gray-500">Projected non-compliant days</span>
                <span className="font-semibold text-gray-900">{whatIf.projectedNonCompliantDays}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-500">Penalty saved</span>
                <span className={`font-bold ${whatIf.penaltySaved > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                  {whatIf.penaltySaved > 0 ? `+ ${formatAUD(whatIf.penaltySaved)}` : '$0.00'}
                </span>
              </div>
            </div>

            {whatIf.projectedCompliancePct >= 1 && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-700 font-medium flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Adding {extraShifts} extra RN shift{extraShifts > 1 ? 's' : ''}/week would achieve full Q2 compliance.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
