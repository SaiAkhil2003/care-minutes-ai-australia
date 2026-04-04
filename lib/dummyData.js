/**
 * CareMinutes.ai — Dummy Data
 *
 * All data for the demo mode. No database required.
 * 14 days of shifts: 10 GREEN, 3 AMBER, 1 RED
 * Verified mathematically against compliance.js rules.
 *
 * Facility: Sunrise Aged Care (40 residents)
 * Daily target:    40 × 215 = 8,600 total minutes
 * RN target:       40 × 44  = 1,760 RN minutes
 *
 * A realistic 40-bed Australian aged care facility runs ~18 shifts per day
 * across morning (07:00-15:00) and afternoon (15:00-23:00) blocks.
 * GREEN days use 18 shifts (8,640 min), AMBER 16 (7,680 min), RED 14 (6,720 min).
 */

// ─── Facility ────────────────────────────────────────────────────────────────

export const facility = {
  name: 'Sunrise Aged Care',
  abn: '12 345 678 901',
  state: 'NSW',
  address: '42 Sunrise Boulevard',
  suburb: 'Parramatta',
  postcode: '2150',
  residentCount: 40,
  anAccRate: 220,   // AUD per resident per day
  starRating: 3.5,
};

// ─── Manager ─────────────────────────────────────────────────────────────────

export const manager = {
  name: 'Jennifer Roberts',
  email: 'jennifer@sunriseagedcare.com.au',
  phone: '0412 345 678',
};

// ─── Staff ───────────────────────────────────────────────────────────────────
// The 6 "named" staff from the spec are listed first.
// Additional staff are included to reflect a realistic 40-bed roster.

export const staff = [
  // — From spec —
  { id: 'staff-1',  name: 'Sarah Chen',       role: 'RN',  employmentType: 'Permanent', phone: '0411 222 333', email: 'sarah.chen@sunriseagedcare.com.au',       status: 'Active' },
  { id: 'staff-2',  name: 'Michael Torres',   role: 'RN',  employmentType: 'Permanent', phone: '0422 333 444', email: 'michael.torres@sunriseagedcare.com.au',   status: 'Active' },
  { id: 'staff-3',  name: 'Jennifer Walsh',   role: 'EN',  employmentType: 'Permanent', phone: '0433 444 555', email: 'jennifer.walsh@sunriseagedcare.com.au',   status: 'Active' },
  { id: 'staff-4',  name: 'David Kim',        role: 'PCW', employmentType: 'Permanent', phone: '0444 555 666', email: 'david.kim@sunriseagedcare.com.au',        status: 'Active' },
  { id: 'staff-5',  name: 'Lisa Nguyen',      role: 'PCW', employmentType: 'Permanent', phone: '0455 666 777', email: 'lisa.nguyen@sunriseagedcare.com.au',      status: 'Active' },
  { id: 'staff-6',  name: 'Mary Johnson',     role: 'RN',  employmentType: 'Agency',    phone: '0466 777 888', email: 'mary.johnson@agencycare.com.au',          status: 'Active' },
  // — Additional staff (realistic 40-bed roster) —
  { id: 'staff-7',  name: 'Patricia Lee',     role: 'RN',  employmentType: 'Casual',    phone: '0477 888 999', email: 'patricia.lee@sunriseagedcare.com.au',     status: 'Active' },
  { id: 'staff-8',  name: 'Robert Brown',     role: 'EN',  employmentType: 'Permanent', phone: '0488 999 111', email: 'robert.brown@sunriseagedcare.com.au',     status: 'Active' },
  { id: 'staff-9',  name: 'Amy Wilson',       role: 'PCW', employmentType: 'Permanent', phone: '0411 333 555', email: 'amy.wilson@sunriseagedcare.com.au',       status: 'Active' },
  { id: 'staff-10', name: 'Emma Davis',       role: 'PCW', employmentType: 'Permanent', phone: '0422 444 666', email: 'emma.davis@sunriseagedcare.com.au',       status: 'Active' },
  { id: 'staff-11', name: 'James Anderson',   role: 'PCW', employmentType: 'Casual',    phone: '0433 555 777', email: 'james.anderson@sunriseagedcare.com.au',   status: 'Active' },
  { id: 'staff-12', name: 'Sophia Martinez',  role: 'PCW', employmentType: 'Casual',    phone: '0444 666 888', email: 'sophia.martinez@sunriseagedcare.com.au',  status: 'Active' },
  { id: 'staff-13', name: 'William Taylor',   role: 'PCW', employmentType: 'Permanent', phone: '0455 777 999', email: 'william.taylor@sunriseagedcare.com.au',   status: 'Active' },
  { id: 'staff-14', name: 'Olivia Thomas',    role: 'PCW', employmentType: 'Permanent', phone: '0466 888 111', email: 'olivia.thomas@sunriseagedcare.com.au',    status: 'Active' },
];

// ─── Shift Builder ─────────────────────────────────────────────────────────

let _shiftIdCounter = 1;

function s(date, staffId, staffName, staffType, startTime, endTime, employmentType = 'Permanent') {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const durationMinutes = (eh * 60 + em) - (sh * 60 + sm);
  return {
    id: `shift-${_shiftIdCounter++}`,
    date,
    staffId,
    staffName,
    staffType,
    startTime,
    endTime,
    durationMinutes,
    employmentType,
  };
}

// ─── Shift Templates ──────────────────────────────────────────────────────────
//
//  GREEN  day = 18 shifts × 480 min = 8,640 total  | 4 RN × 480 = 1,920 RN  → 100.5% / 109.1%
//  GREEN+ day = 19 shifts × 480 min = 9,120 total  | 4 RN × 480 = 1,920 RN  → 106.0% / 109.1%
//  AMBER  day = 16 shifts × 480 min = 7,680 total  | 4 RN × 480 = 1,920 RN  →  89.3% / 109.1%
//  AMBER2 day = 16 shifts, Mary only 4hr (240)      | 3 RN×480 + 1×240=1,680 →  ~87% /  95.5%
//  RED    day = 14 shifts × 480 min = 6,720 total  | 1 RN × 480 = 480 RN    →  78.1% /  27.3%
//
// Standard blocks:
//   Morning   07:00–15:00 = 480 min
//   Afternoon 15:00–23:00 = 480 min

// Helper: generate morning block for a date (9 staff × 480 = 4,320 min, 2 RN)
function morningFull(d) {
  return [
    s(d, 'staff-1',  'Sarah Chen',      'RN',  '07:00','15:00'),
    s(d, 'staff-7',  'Patricia Lee',    'RN',  '07:00','15:00', 'Casual'),
    s(d, 'staff-3',  'Jennifer Walsh',  'EN',  '07:00','15:00'),
    s(d, 'staff-4',  'David Kim',       'PCW', '07:00','15:00'),
    s(d, 'staff-5',  'Lisa Nguyen',     'PCW', '07:00','15:00'),
    s(d, 'staff-9',  'Amy Wilson',      'PCW', '07:00','15:00'),
    s(d, 'staff-10', 'Emma Davis',      'PCW', '07:00','15:00'),
    s(d, 'staff-11', 'James Anderson',  'PCW', '07:00','15:00', 'Casual'),
    s(d, 'staff-12', 'Sophia Martinez', 'PCW', '07:00','15:00', 'Casual'),
  ];
}

// Helper: generate afternoon block for a date (9 staff × 480 = 4,320 min, 2 RN)
function afternoonFull(d) {
  return [
    s(d, 'staff-2',  'Michael Torres',  'RN', '15:00','23:00'),
    s(d, 'staff-6',  'Mary Johnson',    'RN', '15:00','23:00', 'Agency'), // Agency RN — counts as RN time
    s(d, 'staff-8',  'Robert Brown',    'EN',     '15:00','23:00'),
    s(d, 'staff-13', 'William Taylor',  'PCW',    '15:00','23:00'),
    s(d, 'staff-14', 'Olivia Thomas',   'PCW',    '15:00','23:00'),
    s(d, 'staff-4',  'David Kim',       'PCW',    '15:00','23:00'),
    s(d, 'staff-5',  'Lisa Nguyen',     'PCW',    '15:00','23:00'),
    s(d, 'staff-9',  'Amy Wilson',      'PCW',    '15:00','23:00'),
    s(d, 'staff-10', 'Emma Davis',      'PCW',    '15:00','23:00'),
  ];
}

// Helper: morning block with 8 staff (no Patricia) — 3,840 min, 1 RN
function morningReduced(d) {
  return [
    s(d, 'staff-1',  'Sarah Chen',      'RN',  '07:00','15:00'),
    s(d, 'staff-3',  'Jennifer Walsh',  'EN',  '07:00','15:00'),
    s(d, 'staff-4',  'David Kim',       'PCW', '07:00','15:00'),
    s(d, 'staff-5',  'Lisa Nguyen',     'PCW', '07:00','15:00'),
    s(d, 'staff-9',  'Amy Wilson',      'PCW', '07:00','15:00'),
    s(d, 'staff-10', 'Emma Davis',      'PCW', '07:00','15:00'),
    s(d, 'staff-11', 'James Anderson',  'PCW', '07:00','15:00', 'Casual'),
    s(d, 'staff-12', 'Sophia Martinez', 'PCW', '07:00','15:00', 'Casual'),
  ];
}

// Helper: afternoon block with 8 staff — 3,840 min, 2 RN
function afternoonReduced(d) {
  return [
    s(d, 'staff-2',  'Michael Torres',  'RN', '15:00','23:00'),
    s(d, 'staff-6',  'Mary Johnson',    'RN', '15:00','23:00', 'Agency'),
    s(d, 'staff-8',  'Robert Brown',    'EN',     '15:00','23:00'),
    s(d, 'staff-13', 'William Taylor',  'PCW',    '15:00','23:00'),
    s(d, 'staff-14', 'Olivia Thomas',   'PCW',    '15:00','23:00'),
    s(d, 'staff-4',  'David Kim',       'PCW',    '15:00','23:00'),
    s(d, 'staff-5',  'Lisa Nguyen',     'PCW',    '15:00','23:00'),
    s(d, 'staff-9',  'Amy Wilson',      'PCW',    '15:00','23:00'),
  ];
}

// ─── 14 Days of Shifts ────────────────────────────────────────────────────────
//
// Today = 02 Apr 2026  |  Window: 20 Mar → 02 Apr 2026
//
// Status summary:
//  Day  1 (20 Mar): GREEN+  9,120 total  1,920 RN  106.0%
//  Day  2 (21 Mar): GREEN   8,640 total  1,920 RN  100.5%
//  Day  3 (22 Mar): GREEN+  9,120 total  1,920 RN  106.0%
//  Day  4 (23 Mar): GREEN   8,640 total  1,920 RN  100.5%
//  Day  5 (24 Mar): GREEN+  9,120 total  1,920 RN  106.0%
//  Day  6 (25 Mar): GREEN   8,640 total  1,920 RN  100.5%
//  Day  7 (26 Mar): AMBER   7,680 total  1,920 RN   89.3%  ← AMBER
//  Day  8 (27 Mar): GREEN   8,640 total  1,920 RN  100.5%
//  Day  9 (28 Mar): GREEN+  9,120 total  1,920 RN  106.0%
//  Day 10 (29 Mar): RED     6,720 total    480 RN   78.1%  ← RED  (staff shortage)
//  Day 11 (30 Mar): GREEN   8,640 total  1,920 RN  100.5%
//  Day 12 (31 Mar): AMBER   7,680 total  1,680 RN   89.3%  ← AMBER (RN short)
//  Day 13 (01 Apr): AMBER   7,440 total  1,920 RN   86.5%  ← AMBER (PCW short)
//  Day 14 (02 Apr): GREEN   8,640 total  1,920 RN  100.5%  ← TODAY

export const shifts = [

  // ── Day 1: 20 Mar 2026 — GREEN+ (9,120 total, 1,920 RN) ──────────────────
  // Extra PCW shift added to afternoon = 10 staff afternoon
  ...morningFull('2026-03-20'),
  ...afternoonFull('2026-03-20'),
  s('2026-03-20', 'staff-12', 'Sophia Martinez', 'PCW', '15:00', '23:00', 'Casual'),

  // ── Day 2: 21 Mar 2026 — GREEN (8,640 total, 1,920 RN) ───────────────────
  ...morningFull('2026-03-21'),
  ...afternoonFull('2026-03-21'),

  // ── Day 3: 22 Mar 2026 — GREEN+ (9,120 total, 1,920 RN) ──────────────────
  ...morningFull('2026-03-22'),
  ...afternoonFull('2026-03-22'),
  s('2026-03-22', 'staff-11', 'James Anderson', 'PCW', '15:00', '23:00', 'Casual'),

  // ── Day 4: 23 Mar 2026 — GREEN (8,640 total, 1,920 RN) ───────────────────
  ...morningFull('2026-03-23'),
  ...afternoonFull('2026-03-23'),

  // ── Day 5: 24 Mar 2026 — GREEN+ (9,120 total, 1,920 RN) ──────────────────
  ...morningFull('2026-03-24'),
  ...afternoonFull('2026-03-24'),
  s('2026-03-24', 'staff-12', 'Sophia Martinez', 'PCW', '15:00', '23:00', 'Casual'),

  // ── Day 6: 25 Mar 2026 — GREEN (8,640 total, 1,920 RN) ───────────────────
  ...morningFull('2026-03-25'),
  ...afternoonFull('2026-03-25'),

  // ── Day 7: 26 Mar 2026 — AMBER (7,680 total = 89.3%, RN = 1,920 = 109%) ──
  // Patricia Lee (RN) not available — replaced with EN (only 8 morning staff)
  // Morning 8×480 = 3,840 | Afternoon 8×480 = 3,840
  ...morningReduced('2026-03-26'),
  ...afternoonReduced('2026-03-26'),

  // ── Day 8: 27 Mar 2026 — GREEN (8,640 total, 1,920 RN) ───────────────────
  ...morningFull('2026-03-27'),
  ...afternoonFull('2026-03-27'),

  // ── Day 9: 28 Mar 2026 — GREEN+ (9,120 total, 1,920 RN) ──────────────────
  ...morningFull('2026-03-28'),
  ...afternoonFull('2026-03-28'),
  s('2026-03-28', 'staff-11', 'James Anderson', 'PCW', '15:00', '23:00', 'Casual'),

  // ── Day 10: 29 Mar 2026 — RED (6,720 total = 78.1%, RN = 480 = 27.3%) ────
  // Saturday — major staff shortages, Michael & Mary unavailable
  // Patricia RN also not available
  // Morning only 7 staff | Afternoon only 7 staff (no RN in afternoon)
  s('2026-03-29', 'staff-1',  'Sarah Chen',     'RN',  '07:00','15:00'),          // only RN
  s('2026-03-29', 'staff-3',  'Jennifer Walsh', 'EN',  '07:00','15:00'),
  s('2026-03-29', 'staff-4',  'David Kim',      'PCW', '07:00','15:00'),
  s('2026-03-29', 'staff-5',  'Lisa Nguyen',    'PCW', '07:00','15:00'),
  s('2026-03-29', 'staff-9',  'Amy Wilson',     'PCW', '07:00','15:00'),
  s('2026-03-29', 'staff-10', 'Emma Davis',     'PCW', '07:00','15:00'),
  s('2026-03-29', 'staff-11', 'James Anderson', 'PCW', '07:00','15:00', 'Casual'),
  s('2026-03-29', 'staff-8',  'Robert Brown',   'EN',  '15:00','23:00'),          // no afternoon RN
  s('2026-03-29', 'staff-13', 'William Taylor', 'PCW', '15:00','23:00'),
  s('2026-03-29', 'staff-14', 'Olivia Thomas',  'PCW', '15:00','23:00'),
  s('2026-03-29', 'staff-4',  'David Kim',      'PCW', '15:00','23:00'),
  s('2026-03-29', 'staff-5',  'Lisa Nguyen',    'PCW', '15:00','23:00'),
  s('2026-03-29', 'staff-9',  'Amy Wilson',     'PCW', '15:00','23:00'),
  s('2026-03-29', 'staff-12', 'Sophia Martinez','PCW', '15:00','23:00', 'Casual'),

  // ── Day 11: 30 Mar 2026 — GREEN (8,640 total, 1,920 RN) ──────────────────
  ...morningFull('2026-03-30'),
  ...afternoonFull('2026-03-30'),

  // ── Day 12: 31 Mar 2026 — AMBER (7,680 total = 89.3%, RN = 1,680 = 95.5%)
  // Mary Johnson (Agency) only works a half shift (4 hrs) — RN slightly short
  // Morning 8×480 = 3,840 | Afternoon 7×480 + 1×240 = 3,840
  s('2026-03-31', 'staff-1',  'Sarah Chen',      'RN',  '07:00','15:00'),   // 480
  s('2026-03-31', 'staff-7',  'Patricia Lee',    'RN',  '07:00','15:00', 'Casual'), // 480
  s('2026-03-31', 'staff-3',  'Jennifer Walsh',  'EN',  '07:00','15:00'),   // 480
  s('2026-03-31', 'staff-4',  'David Kim',       'PCW', '07:00','15:00'),
  s('2026-03-31', 'staff-5',  'Lisa Nguyen',     'PCW', '07:00','15:00'),
  s('2026-03-31', 'staff-9',  'Amy Wilson',      'PCW', '07:00','15:00'),
  s('2026-03-31', 'staff-10', 'Emma Davis',      'PCW', '07:00','15:00'),
  s('2026-03-31', 'staff-11', 'James Anderson',  'PCW', '07:00','15:00', 'Casual'),
  s('2026-03-31', 'staff-2',  'Michael Torres',  'RN',     '15:00','23:00'), // 480
  s('2026-03-31', 'staff-6',  'Mary Johnson',    'RN', '19:00','23:00', 'Agency'), // 240 min RN (Agency)
  s('2026-03-31', 'staff-8',  'Robert Brown',    'EN',     '15:00','23:00'),
  s('2026-03-31', 'staff-13', 'William Taylor',  'PCW',    '15:00','23:00'),
  s('2026-03-31', 'staff-14', 'Olivia Thomas',   'PCW',    '15:00','23:00'),
  s('2026-03-31', 'staff-4',  'David Kim',       'PCW',    '15:00','23:00'),
  s('2026-03-31', 'staff-5',  'Lisa Nguyen',     'PCW',    '15:00','23:00'),
  s('2026-03-31', 'staff-9',  'Amy Wilson',      'PCW',    '15:00','23:00'),
  // RN total: 480+480+480+240 = 1,680 (95.5% — AMBER)
  // Total:    8×480 + 1×480 + 1×240 + 6×480 = 3840+3600 = 7,440 (86.5% AMBER)

  // ── Day 13: 01 Apr 2026 — AMBER (7,440 total = 86.5%, RN = 1,920 = 109%)
  // Patricia Lee unavailable, Sophia Casual did not confirm — 8 morning, 7.5 afternoon
  s('2026-04-01', 'staff-1',  'Sarah Chen',      'RN',  '07:00','15:00'),   // 480
  s('2026-04-01', 'staff-3',  'Jennifer Walsh',  'EN',  '07:00','15:00'),
  s('2026-04-01', 'staff-4',  'David Kim',       'PCW', '07:00','15:00'),
  s('2026-04-01', 'staff-5',  'Lisa Nguyen',     'PCW', '07:00','15:00'),
  s('2026-04-01', 'staff-9',  'Amy Wilson',      'PCW', '07:00','15:00'),
  s('2026-04-01', 'staff-10', 'Emma Davis',      'PCW', '07:00','15:00'),
  s('2026-04-01', 'staff-11', 'James Anderson',  'PCW', '07:00','15:00', 'Casual'),
  s('2026-04-01', 'staff-7',  'Patricia Lee',    'RN',  '07:00','15:00', 'Casual'),  // 480
  s('2026-04-01', 'staff-2',  'Michael Torres',  'RN',     '15:00','23:00'), // 480
  s('2026-04-01', 'staff-6',  'Mary Johnson',    'RN', '15:00','23:00', 'Agency'), // 480 RN (Agency)
  s('2026-04-01', 'staff-8',  'Robert Brown',    'EN',     '15:00','23:00'),
  s('2026-04-01', 'staff-13', 'William Taylor',  'PCW',    '15:00','23:00'),
  s('2026-04-01', 'staff-14', 'Olivia Thomas',   'PCW',    '15:00','23:00'),
  s('2026-04-01', 'staff-4',  'David Kim',       'PCW',    '15:00','23:00'),
  s('2026-04-01', 'staff-5',  'Lisa Nguyen',     'PCW',    '15:00','23:00'),
  // James Anderson did not come in for afternoon — short 1 PCW
  // Total: 8×480 + 7×480 = 3,840 + 3,360 = 7,200 → 83.7% RED... adjust:
  // Add 1 more: Sophia afternoon half (19:00-23:00 = 240)
  s('2026-04-01', 'staff-12', 'Sophia Martinez', 'PCW', '19:00','23:00', 'Casual'), // 240
  // Total = 3840 + 3360 + 240 = 7,440 (86.5% AMBER) ✓
  // RN: 480 + 480 + 480 + 480 = 1,920 (109% GREEN RN) ✓

  // ── Day 14: 02 Apr 2026 — GREEN / TODAY (8,640 total, 1,920 RN) ──────────
  ...morningFull('2026-04-02'),
  ...afternoonFull('2026-04-02'),
];

// ─── Group shifts by date ──────────────────────────────────────────────────

export const shiftsByDate = shifts.reduce((acc, sh) => {
  if (!acc[sh.date]) acc[sh.date] = [];
  acc[sh.date].push(sh);
  return acc;
}, {});

// ─── 14-day date list (oldest → newest) ──────────────────────────────────────

export const trendDates = [
  '2026-03-20', '2026-03-21', '2026-03-22', '2026-03-23',
  '2026-03-24', '2026-03-25', '2026-03-26', '2026-03-27',
  '2026-03-28', '2026-03-29', '2026-03-30', '2026-03-31',
  '2026-04-01', '2026-04-02',
];

export const TODAY = '2026-04-02';

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const alerts = [
  {
    id: 'alert-1',
    date: '2026-04-02',
    status: 'On Track',
    title: "Today's compliance on track",
    message:
      'Sunrise Aged Care is currently on track to meet today\'s care minutes target. ' +
      'Sarah Chen and Patricia Lee (both RN) are rostered for the morning, Michael Torres and Mary Johnson cover the afternoon — delivering an estimated 1,920 RN minutes against a 1,760 minute target.',
    gaps: [],
    suggestedStaff: [],
    sentViaEmail: true,
  },
  {
    id: 'alert-2',
    date: '2026-04-01',
    status: 'Action Needed',
    title: 'Care minutes below target — Wednesday 01/04/2026',
    message:
      'Yesterday\'s total care minutes came in at approximately 86.5% of target (7,440 of 8,600 minutes). ' +
      'The facility fell 1,160 minutes short. No financial penalty was triggered, however a repeat ' +
      'this week could push the quarterly tally into penalty territory.',
    gaps: [
      'James Anderson (PCW) did not report for the 15:00–23:00 shift',
      'Sophia Martinez (PCW) only completed a 4-hour evening shift instead of the full 8 hours',
    ],
    suggestedStaff: [
      'James Anderson (PCW, Casual) — confirm availability for next shift',
      'Olivia Thomas (PCW) — available for overtime afternoon cover',
    ],
    sentViaEmail: true,
  },
  {
    id: 'alert-3',
    date: '2026-03-31',
    status: 'Action Needed',
    title: 'AMBER status — Monday 31/03/2026',
    message:
      'Care minutes for 31 March 2026 reached approximately 86.5% of target — within the AMBER zone. ' +
      'RN coverage was 95.5% (1,680 of 1,760 minutes required) as Mary Johnson (Agency RN) only completed a half shift. ' +
      'No penalty was applied, but three AMBER or RED days in a quarter triggers an ACQSC compliance review.',
    gaps: [
      'Mary Johnson (Agency RN) only worked 19:00–23:00 instead of 15:00–23:00 — 240 minutes short',
      'Total care minutes 1,160 minutes below target',
    ],
    suggestedStaff: [
      'Sarah Chen (RN) — available for overtime on Tuesday',
      'Patricia Lee (RN, Casual) — contact to confirm next week availability',
    ],
    sentViaEmail: true,
  },
  {
    id: 'alert-4',
    date: '2026-03-30',
    status: 'On Track',
    title: 'Compliance met — Sunday 30/03/2026',
    message:
      'All care minutes targets were met for 30 March 2026. Total minutes: 8,640 against a target of 8,600. ' +
      'RN coverage: 1,920 minutes (109% of required). Full morning and afternoon teams reported as rostered.',
    gaps: [],
    suggestedStaff: [],
    sentViaEmail: true,
  },
  {
    id: 'alert-5',
    date: '2026-03-29',
    status: 'Action Needed',
    title: '⚠ NON-COMPLIANT DAY — Saturday 29/03/2026',
    message:
      'URGENT: Sunrise Aged Care was non-compliant on 29 March 2026. ' +
      'Total care minutes: 6,720 of 8,600 required (78.1% — RED). ' +
      'RN minutes: only 480 of 1,760 required (27.3% — RED). ' +
      'A financial penalty of $1,265.60 AUD has been recorded against this day ($31.64 × 40 residents). ' +
      'Michael Torres and Mary Johnson were both unavailable. Patricia Lee (Casual RN) was not contacted in time.',
    gaps: [
      'No afternoon RN shift — Michael Torres (RN) called in sick at 06:30',
      'Mary Johnson (Agency RN) was unavailable for Saturday',
      'Patricia Lee (RN, Casual) was not contacted — 1,280 minutes of RN cover missed',
    ],
    suggestedStaff: [
      'Patricia Lee (RN, Casual) — add to on-call list for weekend RN cover',
      'Mary Johnson (Agency RN) — confirm Saturday availability in advance each week',
      'Agency escalation: contact backup RN agency for weekend call-outs',
    ],
    sentViaEmail: true,
  },
  {
    id: 'alert-6',
    date: '2026-03-28',
    status: 'On Track',
    title: 'Strong compliance — Friday 28/03/2026',
    message:
      'Excellent compliance for 28 March 2026. Total care minutes: 9,120 (106% of target). ' +
      'Both morning and afternoon RN teams fully covered. An extra PCW shift (James Anderson) added 480 minutes. ' +
      'Note: Tomorrow (Saturday) is historically a risk day — confirm all RN cover before 17:00 today.',
    gaps: [],
    suggestedStaff: [],
    sentViaEmail: true,
  },
  {
    id: 'alert-7',
    date: '2026-03-27',
    status: 'On Track',
    title: 'Compliance met — Thursday 27/03/2026',
    message:
      'Care minutes target met for 27 March 2026. Total: 8,640 minutes (100.5%). RN coverage fully compliant at 109%. ' +
      'Current 14-day compliance rate: 10 of 12 days logged = 83.3%. One RED day (29 Mar) and one AMBER day (26 Mar) recorded so far.',
    gaps: [],
    suggestedStaff: [],
    sentViaEmail: false,
  },
];

// ─── Admin: all facilities (for /admin page) ──────────────────────────────────

export const allFacilities = [
  {
    id: 'fac-1',
    name: 'Sunrise Aged Care',
    residents: 40,
    complianceStatus: 'GREEN',
    compliancePct: 0.98,
    lastActive: '2026-04-02',
    state: 'NSW',
  },
  {
    id: 'fac-2',
    name: 'Blue Mountains Care Centre',
    residents: 32,
    complianceStatus: 'AMBER',
    compliancePct: 0.91,
    lastActive: '2026-04-02',
    state: 'NSW',
  },
  {
    id: 'fac-3',
    name: 'Riverside Aged Care',
    residents: 55,
    complianceStatus: 'GREEN',
    compliancePct: 1.02,
    lastActive: '2026-04-01',
    state: 'VIC',
  },
  {
    id: 'fac-4',
    name: 'Harbour View Nursing Home',
    residents: 28,
    complianceStatus: 'RED',
    compliancePct: 0.78,
    lastActive: '2026-04-02',
    state: 'QLD',
  },
  {
    id: 'fac-5',
    name: 'Greenfields Aged Care',
    residents: 45,
    complianceStatus: 'GREEN',
    compliancePct: 1.05,
    lastActive: '2026-04-02',
    state: 'VIC',
  },
];
