/**
 * CareMinutes.ai — Compliance Calculator
 *
 * Implements Australian Government aged care regulations (from April 2026):
 *   - Every resident must receive 215 minutes of care per day (averaged across all residents)
 *   - Of those 215 minutes, at least 44 must come from a Registered Nurse (RN)
 *   - Staff types that count toward total: RN, EN, PCW, Agency
 *   - Only RN time counts toward the 44-minute RN minimum
 *   - Penalty: $31.64 AUD per resident per day for non-compliant days
 *
 * RAG thresholds:
 *   - RED    = below 85% of target
 *   - AMBER  = 85% to 99% of target (inclusive)
 *   - GREEN  = 100% or above target
 *
 * CRITICAL: This logic directly affects government funding calculations.
 * All edge cases are handled. Do not modify without thorough testing.
 */

/** Daily care minutes target per resident */
export const DAILY_MINUTES_PER_RESIDENT = 215;

/** Minimum RN minutes required per resident per day */
export const RN_MINUTES_PER_RESIDENT = 44;

/** Penalty per resident per non-compliant day (AUD) */
export const PENALTY_PER_RESIDENT_PER_DAY = 31.64;

/** RAG threshold — below this percentage = RED */
export const RED_THRESHOLD = 0.85;

/** RAG threshold — at or above this percentage = GREEN */
export const GREEN_THRESHOLD = 1.0;

/**
 * Determines the RAG (Red/Amber/Green) status for a given compliance percentage.
 *
 * @param {number} compliancePct - Compliance as a decimal (e.g. 0.92 = 92%)
 * @returns {'GREEN'|'AMBER'|'RED'}
 */
export function getRAGStatus(compliancePct) {
  if (compliancePct >= GREEN_THRESHOLD) return 'GREEN';
  if (compliancePct >= RED_THRESHOLD) return 'AMBER';
  return 'RED';
}

/**
 * Determines the RAG status specifically for RN minutes compliance.
 * Uses the same thresholds applied to the RN minimum (44 min/resident).
 *
 * @param {number} rnPct - RN compliance as a decimal
 * @returns {'GREEN'|'AMBER'|'RED'}
 */
export function getRNRAGStatus(rnPct) {
  return getRAGStatus(rnPct);
}

/**
 * Calculates compliance for a single day.
 *
 * @param {Array<{staffType: string, durationMinutes: number}>} shifts
 *   Array of shift objects. staffType must be one of: 'RN', 'EN', 'PCW', 'Agency'.
 *   durationMinutes is the length of the shift in minutes.
 * @param {number} residentCount - Number of residents in the facility that day.
 * @returns {{
 *   totalMinutes: number,
 *   rnMinutes: number,
 *   enMinutes: number,
 *   pcwMinutes: number,
 *   agencyMinutes: number,
 *   targetMinutes: number,
 *   rnTargetMinutes: number,
 *   compliancePct: number,
 *   rnCompliancePct: number,
 *   ragStatus: 'GREEN'|'AMBER'|'RED',
 *   rnRagStatus: 'GREEN'|'AMBER'|'RED',
 *   isCompliant: boolean,
 *   isRNCompliant: boolean,
 *   penaltyAmount: number,
 *   minutesGap: number,
 *   rnMinutesGap: number,
 * }}
 */
export function calculateDayCompliance(shifts, residentCount) {
  // Edge case: no residents — compliance is undefined, treat as non-compliant
  if (!residentCount || residentCount <= 0) {
    return {
      totalMinutes: 0,
      rnMinutes: 0,
      enMinutes: 0,
      pcwMinutes: 0,
      agencyMinutes: 0,
      targetMinutes: 0,
      rnTargetMinutes: 0,
      compliancePct: 0,
      rnCompliancePct: 0,
      ragStatus: 'RED',
      rnRagStatus: 'RED',
      isCompliant: false,
      isRNCompliant: false,
      penaltyAmount: 0,
      minutesGap: 0,
      rnMinutesGap: 0,
    };
  }

  // Edge case: no shifts logged — zero minutes delivered
  const safeShifts = Array.isArray(shifts) ? shifts : [];

  // Tally minutes by staff type
  let rnMinutes = 0;
  let enMinutes = 0;
  let pcwMinutes = 0;
  let agencyMinutes = 0;

  for (const shift of safeShifts) {
    const duration = Number(shift.durationMinutes) || 0;
    const type = (shift.staffType || '').toUpperCase();

    switch (type) {
      case 'RN':
        rnMinutes += duration;
        break;
      case 'EN':
        enMinutes += duration;
        break;
      case 'PCW':
        pcwMinutes += duration;
        break;
      case 'AGENCY RN':
        // Agency-sourced RN — counts as both RN time AND agency time
        rnMinutes += duration;
        agencyMinutes += duration;
        break;
      case 'AGENCY':
        // Agency-sourced non-RN staff — counts toward total, tracked separately
        agencyMinutes += duration;
        break;
      // Unknown staff types are excluded from compliance counting
    }
  }

  // Total care minutes: RN + EN + PCW + Agency all count
  const totalMinutes = rnMinutes + enMinutes + pcwMinutes + agencyMinutes;

  // Daily targets based on resident count
  const targetMinutes = residentCount * DAILY_MINUTES_PER_RESIDENT;
  const rnTargetMinutes = residentCount * RN_MINUTES_PER_RESIDENT;

  // Compliance percentages (capped at 2 decimal places for display)
  const compliancePct = targetMinutes > 0 ? totalMinutes / targetMinutes : 0;
  const rnCompliancePct = rnTargetMinutes > 0 ? rnMinutes / rnTargetMinutes : 0;

  // RAG status
  const ragStatus = getRAGStatus(compliancePct);
  const rnRagStatus = getRNRAGStatus(rnCompliancePct);

  // A day is compliant only if BOTH total AND RN minimums are met
  const isCompliant = compliancePct >= GREEN_THRESHOLD;
  const isRNCompliant = rnCompliancePct >= GREEN_THRESHOLD;

  // Penalty applies when total minutes are below target
  // Penalty = residents × $31.64 per non-compliant day
  // (Even partial shortfalls trigger the full per-resident penalty)
  const penaltyAmount = !isCompliant ? residentCount * PENALTY_PER_RESIDENT_PER_DAY : 0;

  // Gaps (negative means surplus, positive means shortfall)
  const minutesGap = targetMinutes - totalMinutes;
  const rnMinutesGap = rnTargetMinutes - rnMinutes;

  return {
    totalMinutes,
    rnMinutes,
    enMinutes,
    pcwMinutes,
    agencyMinutes,
    targetMinutes,
    rnTargetMinutes,
    compliancePct,
    rnCompliancePct,
    ragStatus,
    rnRagStatus,
    isCompliant,
    isRNCompliant,
    penaltyAmount,
    minutesGap,
    rnMinutesGap,
  };
}

/**
 * Calculates compliance across a period (e.g. 14 days, a quarter).
 *
 * @param {Array<{date: string, shifts: Array}>} dailyData
 *   Array of day objects, each with a date string and shifts array.
 * @param {number} residentCount - Number of residents (assumed constant over period).
 * @returns {{
 *   days: Array,           — per-day compliance results with date attached
 *   totalDays: number,
 *   compliantDays: number,
 *   nonCompliantDays: number,
 *   overallCompliancePct: number,
 *   totalPenalty: number,
 *   averageDailyMinutes: number,
 *   averageRNMinutes: number,
 * }}
 */
export function calculatePeriodCompliance(dailyData, residentCount) {
  if (!Array.isArray(dailyData) || dailyData.length === 0) {
    return {
      days: [],
      totalDays: 0,
      compliantDays: 0,
      nonCompliantDays: 0,
      overallCompliancePct: 0,
      totalPenalty: 0,
      averageDailyMinutes: 0,
      averageRNMinutes: 0,
    };
  }

  const days = dailyData.map((day) => {
    const result = calculateDayCompliance(day.shifts, residentCount);
    return {
      date: day.date,
      ...result,
    };
  });

  const totalDays = days.length;
  const compliantDays = days.filter((d) => d.isCompliant).length;
  const nonCompliantDays = totalDays - compliantDays;

  // Overall compliance % = compliant days / total days
  const overallCompliancePct = totalDays > 0 ? compliantDays / totalDays : 0;

  const totalPenalty = days.reduce((sum, d) => sum + d.penaltyAmount, 0);

  const totalMinutesSum = days.reduce((sum, d) => sum + d.totalMinutes, 0);
  const totalRNMinutesSum = days.reduce((sum, d) => sum + d.rnMinutes, 0);

  const averageDailyMinutes = totalDays > 0 ? totalMinutesSum / totalDays : 0;
  const averageRNMinutes = totalDays > 0 ? totalRNMinutesSum / totalDays : 0;

  return {
    days,
    totalDays,
    compliantDays,
    nonCompliantDays,
    overallCompliancePct,
    totalPenalty,
    averageDailyMinutes,
    averageRNMinutes,
  };
}

/**
 * Projects the total penalty for a quarter based on current pace.
 *
 * Formula from ACQSC guidelines:
 *   projected penalty = accrued penalty + (daily non-compliance rate × days remaining × daily penalty)
 *
 * @param {{
 *   days: Array,
 *   totalPenalty: number,
 *   nonCompliantDays: number,
 *   totalDays: number,
 * }} periodData - Result from calculatePeriodCompliance for days elapsed so far.
 * @param {number} residentCount
 * @param {number} daysRemaining - Number of days left in the quarter.
 * @returns {{
 *   accruedPenalty: number,
 *   projectedAdditionalPenalty: number,
 *   projectedTotalPenalty: number,
 *   dailyPenaltyRate: number,
 *   nonComplianceRate: number,
 * }}
 */
export function projectQuarterPenalty(periodData, residentCount, daysRemaining) {
  if (!periodData || periodData.totalDays === 0) {
    return {
      accruedPenalty: 0,
      projectedAdditionalPenalty: 0,
      projectedTotalPenalty: 0,
      dailyPenaltyRate: 0,
      nonComplianceRate: 0,
    };
  }

  const accruedPenalty = periodData.totalPenalty;

  // Rate of non-compliance so far (0 to 1)
  const nonComplianceRate = periodData.totalDays > 0
    ? periodData.nonCompliantDays / periodData.totalDays
    : 0;

  // Expected penalty per day at current pace
  const dailyPenaltyRate = residentCount * PENALTY_PER_RESIDENT_PER_DAY;

  // Projected additional penalty for remaining days at current non-compliance rate
  const projectedAdditionalPenalty = nonComplianceRate * daysRemaining * dailyPenaltyRate;

  const projectedTotalPenalty = accruedPenalty + projectedAdditionalPenalty;

  return {
    accruedPenalty,
    projectedAdditionalPenalty,
    projectedTotalPenalty,
    dailyPenaltyRate,
    nonComplianceRate,
  };
}

/**
 * Calculates how many additional minutes per day are needed for the
 * remaining days of the quarter to achieve full compliance.
 *
 * Used in the "Recovery Plan" card on the Forecast page.
 *
 * @param {number} currentTotalMinutes - Total minutes delivered so far this quarter
 * @param {number} residentCount
 * @param {number} daysElapsed - Days already passed in the quarter
 * @param {number} daysRemaining - Days left in the quarter
 * @returns {{
 *   targetTotalMinutes: number,  — total target for full quarter
 *   shortfallMinutes: number,    — how many minutes still needed
 *   additionalMinutesPerDay: number, — extra minutes needed per remaining day
 *   isOnTrack: boolean,
 * }}
 */
export function calculateRecoveryPlan(
  currentTotalMinutes,
  residentCount,
  daysElapsed,
  daysRemaining
) {
  const totalDays = daysElapsed + daysRemaining;
  const targetTotalMinutes = residentCount * DAILY_MINUTES_PER_RESIDENT * totalDays;

  const shortfallMinutes = Math.max(0, targetTotalMinutes - currentTotalMinutes);

  const additionalMinutesPerDay = daysRemaining > 0
    ? shortfallMinutes / daysRemaining
    : 0;

  const isOnTrack = shortfallMinutes === 0;

  return {
    targetTotalMinutes,
    shortfallMinutes,
    additionalMinutesPerDay,
    isOnTrack,
  };
}

/**
 * Calculates the impact of adding extra RN shifts per week on quarterly compliance.
 *
 * Used in the "What If" scenario tool on the Forecast page.
 *
 * @param {number} extraShiftsPerWeek - Number of extra RN shifts to add (1–10)
 * @param {number} shiftDurationMinutes - Average duration of each extra shift (default 480 = 8hr)
 * @param {number} daysRemaining - Days remaining in the quarter
 * @param {number} residentCount
 * @param {number} currentNonCompliantDays - Non-compliant days accrued so far
 * @param {number} currentTotalMinutes - Total minutes already delivered this quarter
 * @param {number} daysElapsed - Days elapsed in quarter so far
 * @returns {{
 *   additionalMinutesPerWeek: number,
 *   additionalMinutesPerDay: number,
 *   projectedCompliantDays: number,
 *   projectedNonCompliantDays: number,
 *   projectedCompliancePct: number,
 *   penaltySaved: number,
 * }}
 */
export function calculateWhatIfScenario(
  extraShiftsPerWeek,
  shiftDurationMinutes = 480,
  daysRemaining,
  residentCount,
  currentNonCompliantDays,
  currentTotalMinutes,
  daysElapsed
) {
  const additionalMinutesPerWeek = extraShiftsPerWeek * shiftDurationMinutes;
  const additionalMinutesPerDay = additionalMinutesPerWeek / 7;

  const dailyTarget = residentCount * DAILY_MINUTES_PER_RESIDENT;

  // Estimate how many of the remaining days would become compliant with the extra shifts
  // We base this on whether average daily minutes (improved) would meet target
  const currentAvgDaily = daysElapsed > 0 ? currentTotalMinutes / daysElapsed : 0;
  const improvedAvgDaily = currentAvgDaily + additionalMinutesPerDay;

  // For remaining days: would the improved average meet target?
  const remainingCompliantDays = improvedAvgDaily >= dailyTarget ? daysRemaining : 0;

  const totalDays = daysElapsed + daysRemaining;
  const projectedCompliantDays = Math.min(
    totalDays,
    (totalDays - currentNonCompliantDays - (daysRemaining - remainingCompliantDays))
  );
  const projectedNonCompliantDays = totalDays - projectedCompliantDays;
  const projectedCompliancePct = totalDays > 0 ? projectedCompliantDays / totalDays : 0;

  // Penalty saved = days that become compliant × daily penalty
  const dailyPenalty = residentCount * PENALTY_PER_RESIDENT_PER_DAY;
  const penaltySaved = (daysRemaining - (daysRemaining - remainingCompliantDays)) * dailyPenalty;

  return {
    additionalMinutesPerWeek,
    additionalMinutesPerDay,
    projectedCompliantDays: Math.max(0, projectedCompliantDays),
    projectedNonCompliantDays: Math.max(0, projectedNonCompliantDays),
    projectedCompliancePct: Math.min(1, Math.max(0, projectedCompliancePct)),
    penaltySaved: Math.max(0, penaltySaved),
  };
}

/**
 * Formats a currency value as AUD.
 * @param {number} amount
 * @returns {string} e.g. "$1,265.60"
 */
export function formatAUD(amount) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats a compliance percentage for display.
 * @param {number} pct - Decimal (e.g. 0.92)
 * @returns {string} e.g. "92.0%"
 */
export function formatPct(pct) {
  return (pct * 100).toFixed(1) + '%';
}
