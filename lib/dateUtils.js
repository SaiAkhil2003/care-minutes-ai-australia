/**
 * CareMinutes.ai — Australian Date Utilities
 *
 * All "today" logic must use the Australia/Sydney IANA timezone identifier.
 * This correctly handles AEST (UTC+10, April–October) and
 * AEDT (UTC+11, October–April, daylight saving) automatically —
 * no manual offset arithmetic needed.
 *
 * Safe to call on Node.js 18+ (server) and all modern browsers (client).
 */

/**
 * Returns today's date in Australian Eastern Time as YYYY-MM-DD.
 * The 'en-CA' locale is used because it reliably emits that format.
 *
 * @returns {string} e.g. "2026-04-07"
 */
export function getAustralianToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
}

/**
 * Returns the current Australian time as a human-readable string.
 * Useful for logging and display.
 *
 * @returns {string} e.g. "07/04/2026, 07:00:00 AM"
 */
export function getAustralianNow() {
  return new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' });
}

/**
 * Returns quarter metadata for any ISO date string (YYYY-MM-DD).
 *   Q1 = Jan–Mar  |  Q2 = Apr–Jun  |  Q3 = Jul–Sep  |  Q4 = Oct–Dec
 *
 * @param {string} isoDate — "YYYY-MM-DD"
 * @returns {{
 *   quarter: number,
 *   year: number,
 *   start: string,
 *   end: string,
 *   totalDays: number,
 *   label: string,
 *   prevQuarterLabel: string,
 * }}
 */
export function getQuarterInfo(isoDate) {
  const [y, m] = isoDate.split('-').map(Number);
  const q = Math.ceil(m / 3);

  const startMonth = (q - 1) * 3 + 1;
  const endMonth   = q * 3;

  const start = `${y}-${String(startMonth).padStart(2, '0')}-01`;
  const lastDay = new Date(y, endMonth, 0).getDate(); // day 0 of next month = last day of this month
  const end   = `${y}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const totalDays =
    Math.round((new Date(end + 'T00:00:00') - new Date(start + 'T00:00:00')) / 86400000) + 1;

  // Previous quarter label for display (e.g. "Q1 2026")
  const prevQ = q === 1 ? 4 : q - 1;
  const prevY = q === 1 ? y - 1 : y;
  const prevQuarterLabel = `Q${prevQ} ${prevY}`;

  return {
    quarter: q,
    year:    y,
    start,
    end,
    totalDays,
    label:            `Q${q} ${y}`,
    prevQuarterLabel,
  };
}

/**
 * Generates every calendar date between startISO and endISO inclusive.
 *
 * @param {string} startISO — "YYYY-MM-DD"
 * @param {string} endISO   — "YYYY-MM-DD"
 * @returns {string[]}
 */
export function generateDateRange(startISO, endISO) {
  const dates = [];
  const current = new Date(startISO + 'T00:00:00');
  const end     = new Date(endISO   + 'T00:00:00');
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Returns the ISO week number (1–53) for an ISO date string.
 * Weeks start on Monday per ISO 8601.
 *
 * @param {string} isoDate — "YYYY-MM-DD"
 * @returns {number}
 */
export function getISOWeek(isoDate) {
  const d = new Date(isoDate);
  const day = d.getDay() || 7; // treat Sunday as 7
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Returns date filter range objects for the shifts/reports pages,
 * computed dynamically relative to a given today.
 *
 * @param {string} today — "YYYY-MM-DD" in Australian time
 * @returns {{ Today, 'This Week', 'Last Week', 'This Month': { from: string, to: string } }}
 */
export function getFilterRanges(today) {
  const todayD = new Date(today + 'T00:00:00');

  function toISO(d) {
    return d.toISOString().split('T')[0];
  }

  const dow      = todayD.getDay(); // 0 = Sun
  const daysBack = dow === 0 ? 6 : dow - 1; // days back to Monday

  const thisMonday = new Date(todayD);
  thisMonday.setDate(todayD.getDate() - daysBack);

  const thisSunday = new Date(thisMonday);
  thisSunday.setDate(thisMonday.getDate() + 6);

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);

  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(thisMonday.getDate() - 1);

  const firstOfMonth = new Date(todayD.getFullYear(), todayD.getMonth(), 1);
  const lastOfMonth  = new Date(todayD.getFullYear(), todayD.getMonth() + 1, 0);

  return {
    'Today':      { from: today,               to: today               },
    'This Week':  { from: toISO(thisMonday),    to: toISO(thisSunday)   },
    'Last Week':  { from: toISO(lastMonday),    to: toISO(lastSunday)   },
    'This Month': { from: toISO(firstOfMonth),  to: toISO(lastOfMonth)  },
  };
}
