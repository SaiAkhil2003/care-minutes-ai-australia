'use client';

import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import {
  Users, Clock, TrendingUp, AlertTriangle, Star, ExternalLink,
  CheckCircle, XCircle, Activity,
} from 'lucide-react';
import { facility, shiftsByDate, trendDates, TODAY } from '@/lib/dummyData';
import {
  calculateDayCompliance,
  calculatePeriodCompliance,
  formatAUD,
  formatPct,
} from '@/lib/compliance';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(isoDate) {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

function getTodayFormatted() {
  return formatDate(TODAY);
}

function ragColour(status) {
  if (status === 'GREEN') return '#22c55e';
  if (status === 'AMBER') return '#f59e0b';
  return '#ef4444';
}

function ragBg(status) {
  if (status === 'GREEN') return 'bg-green-100 text-green-800';
  if (status === 'AMBER') return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ title, value, sub, icon: Icon, iconColour }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
        </div>
        <div className={`p-2 rounded-lg ${iconColour}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ pct, colour }) {
  const capped = Math.min(pct, 1);
  return (
    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
      <div
        className="h-2.5 rounded-full transition-all duration-500"
        style={{ width: `${capped * 100}%`, backgroundColor: colour }}
      />
    </div>
  );
}

function StarRating({ rating }) {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f${i}`} className="w-5 h-5 fill-amber-400 text-amber-400" />
      ))}
      {half === 1 && (
        <span className="relative w-5 h-5">
          <Star className="w-5 h-5 text-gray-200 absolute" />
          <span className="absolute left-0 top-0 overflow-hidden w-1/2">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
          </span>
        </span>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <Star key={`e${i}`} className="w-5 h-5 text-gray-200" />
      ))}
    </div>
  );
}

// Custom tooltip for trend chart
function TrendTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const pct = payload[0]?.value;
  const status = pct >= 100 ? 'GREEN' : pct >= 85 ? 'AMBER' : 'RED';
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="font-bold" style={{ color: ragColour(status) }}>
        {pct?.toFixed(1)}% compliance
      </p>
      <p className={`mt-0.5 inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${ragBg(status)}`}>
        {status}
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [anAccRate] = useState(facility.anAccRate);

  // Today's compliance
  const todayShifts = shiftsByDate[TODAY] || [];
  const todayData   = useMemo(() => calculateDayCompliance(todayShifts, facility.residentCount), []);

  // 14-day period compliance
  const periodData = useMemo(() => {
    const daily = trendDates.map(date => ({ date, shifts: shiftsByDate[date] || [] }));
    return calculatePeriodCompliance(daily, facility.residentCount);
  }, []);

  // 14-day trend chart data
  const trendChartData = useMemo(() =>
    periodData.days.map(d => ({
      date: formatDate(d.date),
      compliance: parseFloat((d.compliancePct * 100).toFixed(1)),
      status: d.ragStatus,
    })),
  [periodData]);

  // Staff breakdown for today
  const staffBreakdown = useMemo(() => {
    const perm = todayShifts.filter(s => s.employmentType !== 'Agency');
    const agency = todayShifts.filter(s => s.employmentType === 'Agency');
    const byType = (type) => todayShifts.filter(s => s.staffType === type).reduce((a, s) => a + s.durationMinutes, 0);
    return {
      rn:  byType('RN'),
      en:  byType('EN'),
      pcw: byType('PCW'),
      agency: agency.reduce((a, s) => a + s.durationMinutes, 0),
      permanent: perm.reduce((a, s) => a + s.durationMinutes, 0),
    };
  }, [todayShifts]);

  // AN-ACC subsidy
  const totalDailySubsidy = facility.residentCount * anAccRate;
  const amountProtected   = todayData.isCompliant ? totalDailySubsidy : 0;
  const amountAtRisk      = !todayData.isCompliant ? totalDailySubsidy : 0;

  // 14-day stats
  const complianceRate14 = periodData.overallCompliancePct;
  const penaltyAtRisk14  = periodData.totalPenalty;
  const todayShiftCount  = todayShifts.length;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{facility.name}</h1>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
              DEMO MODE
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{getTodayFormatted()} · {facility.state}</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm ${
          todayData.isCompliant ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {todayData.isCompliant
            ? <><CheckCircle className="w-4 h-4" /> Compliant Today</>
            : <><XCircle className="w-4 h-4" /> Non-Compliant Today</>
          }
        </div>
      </div>

      {/* ── 4 Quick Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Residents in Care"
          value={facility.residentCount}
          sub="Today"
          icon={Users}
          iconColour="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Shifts Logged Today"
          value={todayShiftCount}
          sub={`${todayShifts.reduce((a, s) => a + s.durationMinutes, 0).toLocaleString()} minutes total`}
          icon={Clock}
          iconColour="bg-purple-50 text-purple-600"
        />
        <StatCard
          title="14-Day Compliance"
          value={formatPct(complianceRate14)}
          sub={`${periodData.compliantDays} of ${periodData.totalDays} days compliant`}
          icon={TrendingUp}
          iconColour={`${complianceRate14 >= 1 ? 'bg-green-50 text-green-600' : complianceRate14 >= 0.85 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}
        />
        <StatCard
          title="Penalty at Risk"
          value={formatAUD(penaltyAtRisk14)}
          sub="Last 14 days"
          icon={AlertTriangle}
          iconColour={penaltyAtRisk14 > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Left column (2/3) ── */}
        <div className="xl:col-span-2 space-y-6">

          {/* Today's Compliance Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Today's Compliance</h2>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ragBg(todayData.ragStatus)}`}>
                {todayData.ragStatus}
              </span>
            </div>

            {/* Total minutes */}
            <div className="mb-4">
              <div className="flex justify-between items-end mb-1.5">
                <span className="text-sm text-gray-600">Total Care Minutes</span>
                <span className="text-sm font-semibold text-gray-900">
                  {todayData.totalMinutes.toLocaleString()} / {todayData.targetMinutes.toLocaleString()} min
                </span>
              </div>
              <ProgressBar pct={todayData.compliancePct} colour={ragColour(todayData.ragStatus)} />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-400">{formatPct(todayData.compliancePct)} of daily target</span>
                {todayData.minutesGap > 0 && (
                  <span className="text-xs text-red-500 font-medium">
                    {todayData.minutesGap.toLocaleString()} min short
                  </span>
                )}
              </div>
            </div>

            {/* RN minutes */}
            <div className="mb-4">
              <div className="flex justify-between items-end mb-1.5">
                <span className="text-sm text-gray-600">RN Minutes (44 min minimum per resident)</span>
                <span className="text-sm font-semibold text-gray-900">
                  {todayData.rnMinutes.toLocaleString()} / {todayData.rnTargetMinutes.toLocaleString()} min
                </span>
              </div>
              <ProgressBar pct={todayData.rnCompliancePct} colour={ragColour(todayData.rnRagStatus)} />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-400">{formatPct(todayData.rnCompliancePct)} of RN target</span>
                {todayData.rnMinutesGap > 0 && (
                  <span className="text-xs text-amber-600 font-medium">
                    {todayData.rnMinutesGap.toLocaleString()} min RN gap
                  </span>
                )}
              </div>
            </div>

            {/* Gap message */}
            {!todayData.isCompliant && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-700 font-medium">
                  ⚠ {todayData.minutesGap.toLocaleString()} minutes short of today's target.
                  Add {Math.ceil(todayData.minutesGap / 480)} additional shift{Math.ceil(todayData.minutesGap / 480) !== 1 ? 's' : ''} to become compliant.
                </p>
              </div>
            )}

            {/* Penalty */}
            <div className={`flex items-center justify-between rounded-lg p-3 ${
              todayData.penaltyAmount > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
            }`}>
              <span className={`text-sm font-medium ${todayData.penaltyAmount > 0 ? 'text-red-700' : 'text-green-700'}`}>
                Penalty at risk today
              </span>
              <span className={`text-sm font-bold ${todayData.penaltyAmount > 0 ? 'text-red-700' : 'text-green-700'}`}>
                {todayData.penaltyAmount > 0 ? formatAUD(todayData.penaltyAmount) : 'None — compliant ✓'}
              </span>
            </div>
          </div>

          {/* 14-Day Trend Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">14-Day Compliance Trend</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    interval={1}
                  />
                  <YAxis
                    domain={[60, 120]}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `${v}%`}
                  />
                  <Tooltip content={<TrendTooltip />} />
                  <ReferenceLine y={100} stroke="#22c55e" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: '100% target', fill: '#22c55e', fontSize: 10, position: 'right' }} />
                  <ReferenceLine y={85}  stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: '85% threshold', fill: '#f59e0b', fontSize: 10, position: 'right' }} />
                  <Line
                    type="monotone"
                    dataKey="compliance"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      const colour = ragColour(payload.status);
                      return <circle key={cx} cx={cx} cy={cy} r={4} fill={colour} stroke="white" strokeWidth={2} />;
                    }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#22c55e] inline-block" /> Green — compliant</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#f59e0b] inline-block" /> Amber — at risk</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#ef4444] inline-block" /> Red — non-compliant</span>
            </div>
          </div>

          {/* Staff Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Today's Staff Breakdown</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'RN Minutes',     value: staffBreakdown.rn,  colour: '#3b82f6', bg: 'bg-blue-50'   },
                { label: 'EN Minutes',     value: staffBreakdown.en,  colour: '#8b5cf6', bg: 'bg-purple-50' },
                { label: 'PCW Minutes',    value: staffBreakdown.pcw, colour: '#22c55e', bg: 'bg-green-50'  },
                { label: 'Agency Minutes', value: staffBreakdown.agency, colour: '#f59e0b', bg: 'bg-amber-50' },
              ].map(({ label, value, colour, bg }) => (
                <div key={label} className={`${bg} rounded-lg p-3`}>
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className="text-xl font-bold" style={{ color: colour }}>{value.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{Math.floor(value/60)}h {value%60}m</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right column (1/3) ── */}
        <div className="space-y-6">

          {/* AN-ACC Subsidy */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-blue-600" />
              <h2 className="font-semibold text-gray-900">AN-ACC Subsidy</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Rate per resident</span>
                <span className="font-medium text-gray-900">{formatAUD(anAccRate)}/day</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total daily subsidy</span>
                <span className="font-bold text-gray-900">{formatAUD(totalDailySubsidy)}</span>
              </div>
              <hr className="border-gray-100" />
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Amount protected</span>
                <span className="font-semibold text-green-600">{formatAUD(amountProtected)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Amount at risk</span>
                <span className={`font-semibold ${amountAtRisk > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {amountAtRisk > 0 ? formatAUD(amountAtRisk) : '$0.00'}
                </span>
              </div>
            </div>
          </div>

          {/* Star Rating */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-amber-500" />
              <h2 className="font-semibold text-gray-900">Star Rating</h2>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <StarRating rating={facility.starRating} />
              <span className="text-2xl font-bold text-gray-900">{facility.starRating}</span>
              <span className="text-sm text-gray-400">/ 5</span>
            </div>
            {complianceRate14 < 1 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                <p className="text-xs text-amber-700">
                  ⚠ Compliance below 100% may affect your star rating on MyAgedCare.
                </p>
              </div>
            )}
            <a
              href="https://www.myagedcare.gov.au"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              View on MyAgedCare
            </a>
          </div>

          {/* 14-Day Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">14-Day Summary</h2>
            <div className="space-y-2">
              {[
                { label: 'Compliant days',     value: `${periodData.compliantDays} days`,    colour: 'text-green-600' },
                { label: 'Non-compliant days', value: `${periodData.nonCompliantDays} days`, colour: 'text-red-600'   },
                { label: 'Avg daily minutes',  value: `${Math.round(periodData.averageDailyMinutes).toLocaleString()} min`, colour: 'text-gray-900' },
                { label: 'Avg RN minutes',     value: `${Math.round(periodData.averageRNMinutes).toLocaleString()} min`,    colour: 'text-blue-600' },
                { label: 'Total penalties',    value: formatAUD(periodData.totalPenalty),    colour: periodData.totalPenalty > 0 ? 'text-red-600' : 'text-gray-400' },
              ].map(({ label, value, colour }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className={`font-semibold ${colour}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
