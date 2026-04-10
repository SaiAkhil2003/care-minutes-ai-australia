'use client';

import { useState, useMemo } from 'react';
import { CheckCircle, AlertTriangle, Stethoscope } from 'lucide-react';
import { shiftsByDate, trendDates, TODAY } from '@/lib/dummyData';

// ─── Constants ────────────────────────────────────────────────────────────────

// Last 7 days up to and including TODAY
const SEVEN_DAYS = [...trendDates.slice(-6), TODAY];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateLabel(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatHour(h) {
  if (h === 0)  return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

/**
 * For each hour H (0–23), check if an RN shift covers it.
 * Handles overnight shifts (e.g. 22:00–06:00).
 */
function getRnCoverage(shiftsForDate) {
  const rnShifts = (shiftsForDate || []).filter(sh => sh.staffType === 'RN');
  return Array.from({ length: 24 }, (_, h) => {
    const covered = rnShifts.some(sh => {
      const [startH] = sh.startTime.split(':').map(Number);
      const [endH]   = sh.endTime.split(':').map(Number);
      if (endH <= startH) {
        // overnight: covers [startH, 24) and [0, endH)
        return h >= startH || h < endH;
      }
      return h >= startH && h < endH;
    });
    // find covering shifts for tooltip
    const coveringRns = rnShifts
      .filter(sh => {
        const [startH] = sh.startTime.split(':').map(Number);
        const [endH]   = sh.endTime.split(':').map(Number);
        if (endH <= startH) return h >= startH || h < endH;
        return h >= startH && h < endH;
      })
      .map(sh => `${sh.staffName} ${sh.startTime}–${sh.endTime}`);
    return { hour: h, covered, coveringRns };
  });
}

function findGaps(coverage) {
  const gaps = [];
  let gapStart = null;
  for (let h = 0; h <= 24; h++) {
    const notCovered = h < 24 && !coverage[h].covered;
    if (notCovered && gapStart === null) {
      gapStart = h;
    } else if (!notCovered && gapStart !== null) {
      gaps.push({ start: gapStart, end: h });
      gapStart = null;
    }
  }
  return gaps;
}

function formatGap(gap) {
  const fmtH = h => {
    if (h === 0 || h === 24) return '12am';
    if (h === 12) return '12pm';
    return h < 12 ? `${h}am` : `${h - 12}pm`;
  };
  return `${fmtH(gap.start)}–${fmtH(gap.end)}`;
}

function coveredHoursCount(coverage) {
  return coverage.filter(c => c.covered).length;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TimelineBar({ coverage, compact = false }) {
  const [tooltip, setTooltip] = useState(null);

  return (
    <div className="relative">
      <div className={`flex gap-px ${compact ? 'h-5' : 'h-7'}`}>
        {coverage.map(({ hour, covered, coveringRns }) => (
          <div
            key={hour}
            className={`flex-1 rounded-sm cursor-pointer transition-opacity hover:opacity-80 ${covered ? 'bg-green-500' : 'bg-red-400'}`}
            onMouseEnter={() => setTooltip({ hour, covered, coveringRns })}
            onMouseLeave={() => setTooltip(null)}
            onClick={() => setTooltip(t => t?.hour === hour ? null : { hour, covered, coveringRns })}
          />
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="absolute z-20 bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap pointer-events-none">
          {tooltip.covered
            ? <>
                <p className="font-semibold text-green-400">RN covered {tooltip.hour}:00–{tooltip.hour + 1}:00</p>
                {tooltip.coveringRns.map((r, i) => <p key={i} className="text-gray-300 mt-0.5">{r}</p>)}
              </>
            : <p className="text-red-400 font-semibold">No RN rostered {tooltip.hour}:00–{tooltip.hour + 1}:00</p>
          }
        </div>
      )}

      {/* Time labels */}
      {!compact && (
        <div className="flex justify-between mt-1.5 text-xs text-gray-400 select-none">
          <span>12am</span>
          <span>6am</span>
          <span>12pm</span>
          <span>6pm</span>
          <span>12am</span>
        </div>
      )}
    </div>
  );
}

function GapBanner({ gaps }) {
  if (gaps.length === 0) {
    return (
      <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-xl p-4">
        <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
        <p className="text-sm font-semibold text-green-800">✓ Full 24/7 RN coverage today</p>
      </div>
    );
  }
  const gapText = gaps.map(g => formatGap(g)).join(', ');
  return (
    <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-4">
      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-red-800">⚠ RN Gap Detected</p>
        <p className="text-xs text-red-700 mt-0.5">No RN rostered {gapText} today</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RnCoveragePage() {
  const coverageByDay = useMemo(() =>
    SEVEN_DAYS.map(date => {
      const coverage = getRnCoverage(shiftsByDate[date]);
      const gaps = findGaps(coverage);
      const covered = coveredHoursCount(coverage);
      return { date, coverage, gaps, covered, hasGap: gaps.length > 0 };
    }),
  []);

  const todayData     = coverageByDay[coverageByDay.length - 1];
  const totalGapsWeek = coverageByDay.reduce((a, d) => a + d.gaps.length, 0);
  const fullDays      = coverageByDay.filter(d => !d.hasGap).length;
  const daysWithGap   = coverageByDay.filter(d => d.hasGap).length;

  // Worst gap: longest consecutive hours gap in the week
  const worstGap = useMemo(() => {
    let worst = null;
    for (const day of coverageByDay) {
      for (const gap of day.gaps) {
        const len = gap.end - gap.start;
        if (!worst || len > worst.len) worst = { ...gap, len, date: day.date };
      }
    }
    return worst;
  }, [coverageByDay]);

  // Most common gap hour range
  const mostCommonGap = useMemo(() => {
    const gapHours = {};
    for (const day of coverageByDay) {
      for (const gap of day.gaps) {
        const key = `${gap.start}-${gap.end}`;
        gapHours[key] = (gapHours[key] || 0) + 1;
      }
    }
    const sorted = Object.entries(gapHours).sort((a, b) => b[1] - a[1]);
    if (!sorted.length) return null;
    const [key] = sorted[0];
    const [s, e] = key.split('-').map(Number);
    return { start: s, end: e };
  }, [coverageByDay]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
          <Stethoscope className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">24/7 RN Coverage</h1>
          <p className="text-sm text-gray-500 mt-0.5">7-day registered nurse coverage tracker</p>
        </div>
      </div>

      {/* ── Today's Gap Banner ── */}
      <div className="mb-6">
        <GapBanner gaps={todayData.gaps} />
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 card-hover">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Full Coverage Days</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{fullDays}</p>
          <p className="text-xs text-gray-400 mt-0.5">of 7 days this week</p>
        </div>
        <div className={`rounded-xl shadow-sm border border-gray-100 p-4 card-hover ${daysWithGap > 0 ? 'stat-gradient-red' : 'stat-gradient-green'}`}>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Days With Gaps</p>
          <p className={`text-2xl font-bold mt-1 ${daysWithGap > 0 ? 'text-red-600' : 'text-green-600'}`}>{daysWithGap}</p>
          <p className="text-xs text-gray-400 mt-0.5">this week</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 card-hover">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Worst gap this week</p>
          <p className="text-2xl font-bold mt-1 text-gray-900">
            {worstGap ? `${worstGap.len}h` : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {worstGap ? formatGap(worstGap) : 'No gaps this week'}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 card-hover">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Most Common Gap</p>
          <p className="text-sm font-bold mt-1 text-gray-900">
            {mostCommonGap ? formatGap(mostCommonGap) : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {mostCommonGap ? 'typical overnight gap' : 'No gaps this week'}
          </p>
        </div>
      </div>

      {/* ── Today's Timeline ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-5 mb-6 card-hover">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">24/7 RN Coverage — Today</h2>
            <p className="text-xs text-gray-400 mt-0.5">{formatDateLabel(TODAY)} · Hover each block for details</p>
          </div>
          <div className="flex items-center gap-3 text-xs shrink-0">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> RN present</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> No RN</span>
          </div>
        </div>

        <TimelineBar coverage={todayData.coverage} />

        {/* Gap summary for today */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex flex-wrap gap-3 text-sm">
            <div>
              <span className="text-gray-500">Hours covered: </span>
              <span className="font-semibold text-green-600">{todayData.covered}h</span>
            </div>
            <div>
              <span className="text-gray-500">Gap: </span>
              <span className={`font-semibold ${24 - todayData.covered > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {24 - todayData.covered > 0 ? `${24 - todayData.covered}h` : 'None'}
              </span>
            </div>
            {todayData.gaps.length > 0 && (
              <div>
                <span className="text-gray-500">Gap window: </span>
                <span className="font-semibold text-red-600">{todayData.gaps.map(g => formatGap(g)).join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 7-Day Coverage View ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden card-hover">
        <div className="px-4 md:px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">7-Day RN Coverage Overview</h2>
          <p className="text-xs text-gray-400 mt-0.5">One row per day — green = RN present, red = no RN</p>
        </div>

        <div className="divide-y divide-gray-50">
          {[...coverageByDay].reverse().map(({ date, coverage, gaps, covered }) => {
            const isToday = date === TODAY;
            const gapHours = 24 - covered;
            return (
              <div key={date} className={`px-4 md:px-5 py-4 ${isToday ? 'bg-blue-50/40' : 'hover:bg-gray-50/60'} transition-colors`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-32 shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{formatDateLabel(date)}</p>
                    {isToday && <span className="text-xs text-blue-600 font-medium">Today</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs shrink-0">
                    <span className="text-green-600 font-medium">{covered}h covered</span>
                    {gapHours > 0 && (
                      <span className="text-red-500 font-medium">{gapHours}h gap</span>
                    )}
                    {gaps.length === 0 && (
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        <CheckCircle className="w-3 h-3" /> Full coverage
                      </span>
                    )}
                    {gaps.length > 0 && (
                      <span className="flex items-center gap-1 text-red-500 font-medium">
                        <AlertTriangle className="w-3 h-3" /> {gaps.map(g => formatGap(g)).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <TimelineBar coverage={coverage} compact />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> RN Covered (any RN on shift)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> No RN (agency RN counts equally)</span>
        <span className="text-gray-400">· Hover or tap each block for details · Overnight shifts split automatically</span>
      </div>
    </div>
  );
}
