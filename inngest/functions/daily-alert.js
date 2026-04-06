import { inngest } from '../client.js';
import { facility, shiftsByDate, trendDates } from '@/lib/dummyData';
import { calculateDayCompliance, formatAUD, formatPct } from '@/lib/compliance';
import { callGemini, buildCompliancePrompt } from '@/lib/gemini';
import { getAlertRecipients } from '@/lib/db';
import { SEED_FACILITY_ID } from '@/lib/seedData';
import { Resend } from 'resend';

// ── RAG colour helpers ────────────────────────────────────────────────────────

function ragColours(status) {
  if (status === 'GREEN')  return { bg: '#dcfce7', border: '#bbf7d0', text: '#15803d' };
  if (status === 'AMBER')  return { bg: '#fef3c7', border: '#fde68a', text: '#92400e' };
  return                          { bg: '#fee2e2', border: '#fecaca', text: '#991b1b' };
}

// ── Email HTML builder ────────────────────────────────────────────────────────

function buildDailyAlertEmail({ facilityName, date, compliance, aiMessage, toEmail }) {
  const [y, m, d] = date.split('-');
  const displayDate = `${d}/${m}/${y}`;
  const rag  = ragColours(compliance.ragStatus);
  const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://care-minutes-ai.netlify.app';

  const penaltyRow = compliance.penaltyAmount > 0
    ? `<tr>
        <td style="padding:10px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Penalty at Risk</td>
        <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#dc2626;border-bottom:1px solid #f3f4f6;">${formatAUD(compliance.penaltyAmount)}</td>
       </tr>`
    : `<tr>
        <td style="padding:10px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Penalty at Risk</td>
        <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#16a34a;border-bottom:1px solid #f3f4f6;">$0.00 — No penalty</td>
       </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>CareMinutes.ai Daily Alert — ${facilityName}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#fff;border-radius:14px 14px 0 0;padding:28px 32px 20px;border-bottom:3px solid #22c55e;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td>
                <span style="font-size:22px;font-weight:800;color:#22c55e;letter-spacing:-0.5px;">CareMinutes</span><span style="font-size:22px;font-weight:800;color:#1e293b;">.ai</span>
                <p style="margin:4px 0 0;font-size:11px;color:#94a3b8;font-weight:500;text-transform:uppercase;letter-spacing:.05em;">Australian Aged Care Compliance</p>
              </td>
              <td align="right">
                <span style="display:inline-block;padding:6px 16px;border-radius:999px;background:${rag.bg};border:1px solid ${rag.border};color:${rag.text};font-size:12px;font-weight:800;letter-spacing:.03em;">
                  ${compliance.ragStatus}
                </span>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- Facility & Date -->
        <tr>
          <td style="background:#fff;padding:20px 32px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
              <tr>
                <td>
                  <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;">Facility</p>
                  <p style="margin:5px 0 0;font-size:17px;font-weight:700;color:#1e293b;">${facilityName}</p>
                </td>
                <td align="right">
                  <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;">Date</p>
                  <p style="margin:5px 0 0;font-size:17px;font-weight:700;color:#1e293b;">${displayDate}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Compliance Numbers -->
        <tr>
          <td style="background:#fff;padding:20px 32px 0;">
            <p style="margin:0 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#475569;">Compliance Summary</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
              <tr style="background:#f8fafc;">
                <td style="padding:10px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Total Care Minutes</td>
                <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#1e293b;border-bottom:1px solid #f3f4f6;">
                  ${compliance.totalMinutes.toLocaleString('en-AU')} <span style="font-weight:400;color:#94a3b8;">of ${compliance.targetMinutes.toLocaleString('en-AU')} min</span>
                  <span style="margin-left:6px;display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:${rag.bg};color:${rag.text};">${formatPct(compliance.compliancePct)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">RN Minutes</td>
                <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#1e293b;border-bottom:1px solid #f3f4f6;">
                  ${compliance.rnMinutes.toLocaleString('en-AU')} <span style="font-weight:400;color:#94a3b8;">of ${compliance.rnTargetMinutes.toLocaleString('en-AU')} min</span>
                  <span style="margin-left:6px;display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:${ragColours(compliance.rnRagStatus).bg};color:${ragColours(compliance.rnRagStatus).text};">${formatPct(compliance.rnCompliancePct)}</span>
                </td>
              </tr>
              ${penaltyRow}
            </table>
          </td>
        </tr>

        <!-- AI Generated Message -->
        <tr>
          <td style="background:#fff;padding:20px 32px 0;">
            <p style="margin:0 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#475569;">AI Generated Summary</p>
            <div style="background:#fafafa;border:1px solid #e2e8f0;border-radius:10px;padding:18px;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align:top;padding-right:14px;">
                  <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#7c3aed);text-align:center;line-height:34px;">
                    <span style="color:#fff;font-size:15px;">⚡</span>
                  </div>
                </td>
                <td>
                  <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">Gemini AI · CareMinutes.ai</p>
                  <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">${aiMessage}</p>
                </td>
              </tr></table>
            </div>
          </td>
        </tr>

        <!-- Action Button -->
        <tr>
          <td style="background:#fff;padding:24px 32px 0;text-align:center;">
            <a href="${dashboardUrl}/dashboard"
               style="display:inline-block;padding:13px 32px;background:#22c55e;color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:.02em;">
              View Dashboard →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#fff;border-radius:0 0 14px 14px;padding:24px 32px;margin-top:8px;border-top:1px solid #f1f5f9;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.7;text-align:center;">
              Sent by <strong style="color:#22c55e;">CareMinutes.ai</strong> · Australian Aged Care Compliance<br>
              Delivered to ${toEmail} · Daily alerts at 07:00 AEST
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Inngest Scheduled Function ────────────────────────────────────────────────

export const dailyAlertFunction = inngest.createFunction(
  {
    id: 'daily-compliance-alert',
    triggers: [{ cron: '0 21 * * *' }],   // 21:00 UTC = 07:00 AEST
  },
  async ({ step }) => {

    // Step 1: Check auto-alert toggle
    // NOTE: localStorage is client-side only. In production, connect this
    // to a database-persisted setting. Here we use an env var (default: enabled).
    const isEnabled = await step.run('check-auto-alert-enabled', async () => {
      return process.env.AUTO_ALERT_ENABLED !== 'false';
    });

    if (!isEnabled) {
      return { status: 'disabled', message: 'Automated daily alert is disabled.' };
    }

    // Step 2: Get facility + calculate compliance for most recent day
    const complianceData = await step.run('calculate-compliance', async () => {
      const date       = trendDates[trendDates.length - 1];
      const dayShifts  = shiftsByDate[date] || [];
      const compliance = calculateDayCompliance(dayShifts, facility.residentCount);
      return {
        date,
        facilityName:  facility.name,
        residentCount: facility.residentCount,
        compliance,
        shifts: dayShifts,
      };
    });

    // Step 3: Get active recipients from Supabase
    const activeEmails = await step.run('get-recipient-emails', async () => {
      const { data } = await getAlertRecipients(SEED_FACILITY_ID);
      const recipients = data?.email_recipients ?? [];
      return recipients.filter(r => r.active).map(r => r.email);
    });

    if (!activeEmails.length) {
      return { status: 'error', message: 'No active email recipients configured.' };
    }

    // Step 4: Build Gemini prompt + call AI
    const aiMessage = await step.run('call-gemini', async () => {
      const prompt = buildCompliancePrompt({
        facilityName:  complianceData.facilityName,
        residentCount: complianceData.residentCount,
        date:          complianceData.date,
        compliance:    complianceData.compliance,
        shifts:        complianceData.shifts,
      });
      return callGemini(prompt);
    });

    // Step 5: Build HTML email + send via Resend to all active recipients
    const sendResult = await step.run('send-email', async () => {
      const { date, facilityName, compliance } = complianceData;
      const [y, m, d] = date.split('-');
      const displayDate = `${d}/${m}/${y}`;

      const html = buildDailyAlertEmail({
        facilityName,
        date,
        compliance,
        aiMessage,
        toEmail: activeEmails.join(', '),
      });

      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data, error } = await resend.emails.send({
        from:    process.env.ALERT_FROM_EMAIL,
        to:      activeEmails,
        subject: `CareMinutes.ai Daily Alert — ${facilityName} ${displayDate}`,
        html,
      });

      if (error) throw new Error(error.message || 'Resend failed');

      return { messageId: data?.id, toEmails: activeEmails };
    });

    return {
      status:    'sent',
      messageId: sendResult.messageId,
      toEmails:  sendResult.toEmails,
      ragStatus: complianceData.compliance.ragStatus,
    };
  }
);
