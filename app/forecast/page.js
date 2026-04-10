'use client';

import { useState, useMemo } from 'react';
import {
  RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer,
  Tooltip, Cell,
} from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { facility, shiftsByDate, trendDates } from '@/lib/dummyData';
import {
  calculatePeriodCompliance,
  formatAUD,
  PENALTY_PER_RESIDENT_PER_DAY,
} from '@/lib/compliance';

// ─── Q2 2026: 01 Apr – 30 Jun (91 days) ──────────────────────────────────────

const Q2_TOTAL_DAYS = 91;
const Q2_START      = '2026-04-01';
const Q2_END        = '2026-06-30';

const Q2_DATES     = trendDates.filter(d => d >= Q2_START);
const Q2_ELAPSED   = Q2_DATES.length;
const Q2_REMAINING = Q2_TOTAL_DAYS - Q2_ELAPSED;

function fmtPct(pct100) {
  return Math.min(pct100, 100).toFixed(1) + '%';
}

function fmtAUD(amount) {
  const rounded = Math.round(Math.max(0, amount) * 100) / 100;
  return formatAUD(rounded);
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function gaugeColour(pct100) {
  if (pct100 >= 100) return '#22c55e';
  if (pct100 >= 85)  return '#f59e0b';
  return '#ef4444';
}

function StatusBadge({ pct100 }) {
  if (pct100 >= 100) {
    return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">On Track</span>;
  }
  if (pct100 >= 85) {
    return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">At Risk</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">Non-Compliant</span>;
}

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

  const q2DailyData = useMemo(() =>
    Q2_DATES.map(date => ({ date, shifts: shiftsByDate[date] || [] })),
  []);

  const q2Period = useMemo(() =>
    calculatePeriodCompliance(q2DailyData, facility.residentCount),
  [q2DailyData]);

  // ── Forecast Engine ──────────────────────────────────────────────────────────
  // daysElapsed = days with at least one shift recorded in current quarter
  const daysElapsed = Q2_DATES.filter(date => (shiftsByDate[date] || []).length > 0).length;

  const totalMinutesSoFar = q2Period.days.reduce((a, d) => a + d.totalMinutes, 0);

  const residentCount    = facility.residentCount;
  const dailyAvgActual   = daysElapsed > 0 ? totalMinutesSoFar / daysElapsed : 0;
  const projectedTotal   = dailyAvgActual * Q2_TOTAL_DAYS;
  const projectedTarget  = residentCount > 0 ? residentCount * 215 * Q2_TOTAL_DAYS : 0;
  const projectedPct     = projectedTarget > 0 ? (projectedTotal / projectedTarget) * 100 : 0;
  const shortfallMins    = Math.max(0, projectedTarget - projectedTotal);
  const projectedPenalty = Math.round((shortfallMins / 215) * 31.64 * 100) / 100;

  // ── Recovery Plan ───────────────────────────────────────────────────────────
  const remainingMinutesNeeded = Math.max(0, projectedTarget - totalMinutesSoFar);
  const minutesPerDayNeeded    = Q2_REMAINING > 0 ? remainingMinutesNeeded / Q2_REMAINING : 0;
  // Extra minutes/day = shortfall spread across remaining days (on top of current pace)
  const extraMinutesPerDay     = Q2_REMAINING > 0 ? shortfallMins / Q2_REMAINING : 0;

  // ── What-If Scenario ────────────────────────────────────────────────────────
  const extraMinutesPerWeek   = extraShifts * 480;
  const extraMinutesRemaining = extraMinutesPerWeek * (Q2_REMAINING / 7);
  const newProjectedTotal     = Math.min(projectedTotal + extraMinutesRemaining, projectedTarget);
  const newProjectedPct       = projectedTarget > 0 ? (newProjectedTotal / projectedTarget) * 100 : 0;
  const newShortfall          = Math.max(0, projectedTarget - newProjectedTotal);
  const newPenalty            = Math.round((newShortfall / 215) * 31.64 * 100) / 100;
  const penaltySaved          = Math.max(0, Math.round((projectedPenalty - newPenalty) * 100) / 100);

  // ── Gauge ───────────────────────────────────────────────────────────────────
  const gaugeValue = Math.min(projectedPct, 100);
  const gaugeData  = [{ name: 'Compliance', value: gaugeValue, fill: gaugeColour(projectedPct) }];

  // ── Penalty Table (historical RED days only) ─────────────────────────────
  const penaltyRows   = q2Period.days.filter(d => d.ragStatus === 'RED').map(d => ({
    date:       formatDate(d.date),
    status:     d.ragStatus,
    residents:  residentCount,
    penaltyDay: PENALTY_PER_RESIDENT_PER_DAY,
    total:      d.penaltyAmount,
  }));
  const redDays       = q2Period.days.filter(d => d.ragStatus === 'RED').length;
  const amberDays     = q2Period.days.filter(d => d.ragStatus === 'AMBER').length;
  const penaltyAccrued = q2Period.totalPenalty;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Quarterly Forecast</h1>
        <p className="text-sm text-gray-500 mt-0.5">Q2 2026 — April to June · {formatDate(Q2_START)} – {formatDate(Q2_END)}</p>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">

        {/* Card 1: Quarter Compliance (projected) */}
        <div className={`rounded-xl shadow-sm border border-gray-100 p-4 md:p-5 card-hover ${projectedPct >= 100 ? 'stat-gradient-green' : projectedPct >= 85 ? 'stat-gradient-amber' : 'stat-gradient-red'}`}>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quarter Compliance</p>
            <StatusBadge pct100={projectedPct} />
          </div>
          <p className={`text-xl md:text-2xl font-bold mt-1 ${projectedPct >= 100 ? 'text-green-600' : projectedPct >= 85 ? 'text-amber-600' : 'text-red-600'}`}>
            {fmtPct(projectedPct)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">projected for full quarter</p>
        </div>

        {/* Card 2: Days Remaining */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5 card-hover">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Days Remaining</p>
          <p className="text-xl md:text-2xl font-bold mt-1 text-gray-900">{Q2_REMAINING}</p>
          <p className="text-xs text-gray-400 mt-0.5">of {Q2_TOTAL_DAYS} days</p>
        </div>

        {/* Card 3: Penalty Accrued (historical RED days only) */}
        <div className={`rounded-xl shadow-sm border border-gray-100 p-4 md:p-5 card-hover ${penaltyAccrued > 0 ? 'stat-gradient-red' : 'stat-gradient-green'}`}>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Penalty Accrued Q2 2026</p>
          <p className={`text-xl md:text-2xl font-bold mt-1 ${penaltyAccrued > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {fmtAUD(penaltyAccrued)}
          </p>
          <div className="mt-1 space-y-0.5">
            <p className="text-xs text-gray-400">Apr 1 – today</p>
            <p className="text-xs text-red-600 font-medium">Penalty days (RED only): {redDays}</p>
            <p className="text-xs text-amber-600 font-medium">AMBER days (at risk): {amberDays}</p>
          </div>
        </div>

        {/* Card 4: Projected Penalty */}
        <div className={`rounded-xl shadow-sm border border-gray-100 p-4 md:p-5 card-hover ${projectedPenalty > 0 ? 'stat-gradient-red' : 'stat-gradient-green'}`}>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Projected Penalty (Q2 2026)</p>
          <p className={`text-xl md:text-2xl font-bold mt-1 ${projectedPenalty > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {fmtAUD(projectedPenalty)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">at current pace</p>
        </div>
      </div>

      {/* ── Q2 Penalty Note ── */}
      {penaltyAccrued === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <CheckCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <span className="font-semibold">No Q2 penalties yet.</span>
            {' '}The $1,265.60 penalty visible in Alerts was recorded on 29 Mar 2026 (Q1 — before this quarter started).
            Q2 began 01 Apr 2026.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">

        {/* ── Left: Gauge + Penalty Table ── */}
        <div className="xl:col-span-2 space-y-4 md:space-y-6">

          {/* Compliance Gauge */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5 card-hover">
            <h2 className="font-semibold text-gray-900 mb-1">Q2 Compliance Gauge</h2>
            <p className="text-xs text-gray-400 mb-4">Based on {Q2_ELAPSED} days of data — updates daily</p>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-40 h-40 md:w-48 md:h-48 relative flex-shrink-0">
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
                  <span className="text-2xl md:text-3xl font-bold" style={{ color: gaugeColour(projectedPct) }}>
                    {gaugeValue.toFixed(0)}%
                  </span>
                  <span className="text-xs text-gray-400 mt-0.5">projected</span>
                </div>
              </div>
              <div className="flex-1 space-y-3 w-full">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-[#22c55e] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">Daily average (actual)</p>
                    <p className="font-semibold text-gray-900 text-sm">{Math.round(dailyAvgActual).toLocaleString()} min/day</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-[#6366f1] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">Projected total (91 days)</p>
                    <p className="font-semibold text-gray-900 text-sm">{Math.round(projectedTotal).toLocaleString()} min</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-[#f59e0b] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">Target (91 days)</p>
                    <p className="font-semibold text-gray-900 text-sm">{projectedTarget.toLocaleString()} min</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-[#ef4444] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">Shortfall (projected)</p>
                    <p className="font-semibold text-gray-900 text-sm">{Math.round(shortfallMins).toLocaleString()} min</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Penalty Breakdown Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden card-hover">
            <div className="px-4 md:px-5 py-4 border-b border-gray-100">
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
                <table className="w-full text-sm min-w-[480px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['Date','Status','Residents','Penalty/Resident','Total Penalty'].map(h => (
                        <th key={h} className="text-left px-3 md:px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {penaltyRows.map((row, i) => (
                      <tr key={i} className={`border-b border-gray-50 hover:bg-red-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                        <td className="px-3 md:px-4 py-3 font-medium text-gray-900">{row.date}</td>
                        <td className="px-3 md:px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            row.status === 'RED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>{row.status}</span>
                        </td>
                        <td className="px-3 md:px-4 py-3 text-gray-700">{row.residents}</td>
                        <td className="px-3 md:px-4 py-3 text-gray-700">{fmtAUD(row.penaltyDay)}</td>
                        <td className="px-3 md:px-4 py-3 font-semibold text-red-600">{fmtAUD(row.total)}</td>
                      </tr>
                    ))}
                    <tr className="bg-red-50 border-t border-red-100">
                      <td colSpan={4} className="px-3 md:px-4 py-3 font-semibold text-gray-700">Total Penalties (Q2 so far)</td>
                      <td className="px-3 md:px-4 py-3 font-bold text-red-700">{fmtAUD(penaltyAccrued)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Recovery Plan + What If ── */}
        <div className="space-y-4 md:space-y-6">

          {/* Recovery Plan */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5 card-hover">
            <div className="flex items-center gap-2 mb-4">
              {shortfallMins === 0
                ? <CheckCircle className="w-4 h-4 text-green-600" />
                : <AlertTriangle className="w-4 h-4 text-amber-600" />
              }
              <h2 className="font-semibold text-gray-900">Recovery Plan</h2>
            </div>
            {shortfallMins === 0 ? (
              <div className="bg-green-600 rounded-lg p-4">
                <p className="text-sm text-white font-semibold">✓ On track — no penalty projected</p>
                <p className="text-xs text-green-100 mt-1">Continue current staffing to maintain compliance.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800 font-semibold">
                    {Math.round(extraMinutesPerDay).toLocaleString()} extra minutes/day needed
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Shortfall of {Math.round(shortfallMins).toLocaleString()} min spread over {Q2_REMAINING} remaining days — roughly {Math.round(extraMinutesPerDay / 480 * 10) / 10 >= 1 ? `~${Math.round(extraMinutesPerDay / 480)} extra shift` : 'less than 1 extra shift'} per day.
                  </p>
                </div>
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'Projected shortfall', value: `${Math.round(shortfallMins).toLocaleString()} min`,         colour: 'text-red-600'   },
                    { label: 'Minutes delivered',   value: `${totalMinutesSoFar.toLocaleString()} min`,                  colour: 'text-gray-900'  },
                    { label: 'Remaining needed',    value: `${Math.round(remainingMinutesNeeded).toLocaleString()} min`, colour: 'text-red-600'   },
                    { label: 'Extra shifts/day',    value: `~${Math.round(extraMinutesPerDay / 480) || 1} shift`,        colour: 'text-amber-600' },
                  ].map(({ label, value, colour }) => (
                    <div key={label} className="flex justify-between py-1 border-b border-gray-50 last:border-0 gap-2">
                      <span className="text-gray-500 shrink-0">{label}</span>
                      <span className={`font-semibold ${colour}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* What If Scenario */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5 card-hover">
            <h2 className="font-semibold text-gray-900 mb-1">What If Scenario</h2>
            <p className="text-xs text-gray-400 mb-4">Slide to see impact of adding extra RN shifts</p>

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700">Extra RN shifts/week</label>
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
                <span>1</span>
                <span>10</span>
              </div>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-gray-50 gap-2">
                <span className="text-gray-500 shrink-0 text-xs">Additional minutes/week</span>
                <span className="font-bold text-sm text-gray-900">{extraMinutesPerWeek.toLocaleString()} min</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50 gap-2">
                <span className="text-gray-500 shrink-0 text-xs">New compliance</span>
                <span className={`font-bold text-sm ${newProjectedPct >= 100 ? 'text-green-600' : newProjectedPct >= 85 ? 'text-amber-600' : 'text-red-600'}`}>
                  {fmtPct(newProjectedPct)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-50 gap-2">
                <span className="text-gray-500 shrink-0 text-xs">New projected penalty</span>
                <span className={`font-bold text-sm ${newPenalty > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {fmtAUD(newPenalty)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 gap-2">
                <span className="text-gray-500 shrink-0 text-xs">Penalty saved</span>
                <span className="font-bold text-sm text-green-600">{fmtAUD(penaltySaved)}</span>
              </div>
            </div>

            {newProjectedPct >= 100 && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-700 font-medium flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 shrink-0" />
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
