import { formatAUD } from '@/lib/compliance';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

/**
 * Calls the Gemini 1.5 Flash API with a text prompt.
 * @param {string} prompt
 * @returns {Promise<string>} generated text
 */
export async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.');

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Gemini API error: ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

/**
 * Builds the Gemini compliance prompt from compliance data + shifts.
 */
export function buildCompliancePrompt({ facilityName, residentCount, date, compliance, shifts }) {
  const [y, m, d] = date.split('-');
  const displayDate = `${d}/${m}/${y}`;
  const totalPct = Math.round(compliance.compliancePct * 100);
  const rnPct   = Math.round(compliance.rnCompliancePct * 100);

  const shiftsText = shifts.length > 0
    ? shifts
        .map(s => `  ${s.staffName} (${s.staffType}) ${s.startTime}–${s.endTime} ${s.durationMinutes}min`)
        .join('\n')
    : '  No shifts recorded';

  return `You are a compliance analyst for Australian aged care facilities.
Write a short morning alert for the Director of Nursing.

Facility: ${facilityName}
Residents: ${residentCount}
Date: ${displayDate}
Total care minutes: ${compliance.totalMinutes} of ${compliance.targetMinutes} (${totalPct}%)
RN minutes: ${compliance.rnMinutes} of ${compliance.rnTargetMinutes} (${rnPct}%)
Status: ${compliance.ragStatus}
Penalty at risk: ${formatAUD(compliance.penaltyAmount)}

Shifts today:
${shiftsText}

Rules:
- Maximum 80 words
- Use Australian English
- If GREEN: positive and reassuring
- If AMBER: suggest adding RN shift
- If RED: urgent tone, name staff to call
- Sound professional but friendly`;
}
