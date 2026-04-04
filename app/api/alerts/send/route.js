import { Resend } from 'resend';
import { shiftsByDate, facility, alerts as dummyAlerts } from '@/lib/dummyData';
import { calculateDayCompliance, formatAUD, formatPct } from '@/lib/compliance';

const TODAY = '2026-04-02';

function toDisplayDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function buildEmailHtml({ alert, compliance, toEmail }) {
  const statusColour  = alert.status === 'On Track' ? '#16a34a' : '#d97706';
  const statusBg      = alert.status === 'On Track' ? '#f0fdf4' : '#fffbeb';
  const statusBorder  = alert.status === 'On Track' ? '#bbf7d0' : '#fde68a';
  const isCompliant   = alert.status === 'On Track';

  const gapsHtml = alert.gaps && alert.gaps.length > 0
    ? `
      <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#be123c;">Identified Gaps</p>
        <ul style="margin:0;padding-left:18px;">
          ${alert.gaps.map(g => `<li style="font-size:14px;color:#9f1239;margin-bottom:4px;">${g}</li>`).join('')}
        </ul>
      </div>`
    : '';

  const staffHtml = alert.suggestedStaff && alert.suggestedStaff.length > 0
    ? `
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#1d4ed8;">Suggested Staff to Contact</p>
        <ul style="margin:0;padding-left:18px;">
          ${alert.suggestedStaff.map(s => `<li style="font-size:14px;color:#1e40af;margin-bottom:4px;">${s}</li>`).join('')}
        </ul>
      </div>`
    : '';

  const penaltyHtml = compliance.penaltyAmount > 0
    ? `<tr>
        <td style="padding:8px 12px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Penalty at Risk</td>
        <td style="padding:8px 12px;font-size:13px;font-weight:700;color:#dc2626;border-bottom:1px solid #f3f4f6;">${formatAUD(compliance.penaltyAmount)}</td>
       </tr>`
    : `<tr>
        <td style="padding:8px 12px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Penalty at Risk</td>
        <td style="padding:8px 12px;font-size:13px;font-weight:700;color:#16a34a;border-bottom:1px solid #f3f4f6;">$0.00 — No penalty</td>
       </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CareMinutes.ai — Daily Compliance Alert</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#ffffff;border-radius:12px 12px 0 0;padding:28px 32px 20px;border-bottom:3px solid #22c55e;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:22px;font-weight:800;color:#22c55e;letter-spacing:-0.5px;">CareMinutes</span><span style="font-size:22px;font-weight:800;color:#1e293b;">.ai</span>
                    <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;font-weight:500;">Australian Aged Care Compliance</p>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;padding:6px 14px;border-radius:999px;background:${statusBg};border:1px solid ${statusBorder};color:${statusColour};font-size:12px;font-weight:700;">
                      ${alert.status}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Facility & Date -->
          <tr>
            <td style="background:#ffffff;padding:20px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;">
                <tr>
                  <td>
                    <p style="margin:0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;">Facility</p>
                    <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#1e293b;">${facility.name}</p>
                  </td>
                  <td align="right">
                    <p style="margin:0;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;">Report Date</p>
                    <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#1e293b;">${toDisplayDate(alert.date)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Compliance Summary -->
          <tr>
            <td style="background:#ffffff;padding:20px 32px 0;">
              <p style="margin:0 0 12px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#475569;">Compliance Summary</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                <tr style="background:#f8fafc;">
                  <td style="padding:8px 12px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Total Care Minutes</td>
                  <td style="padding:8px 12px;font-size:13px;font-weight:700;color:#1e293b;border-bottom:1px solid #f3f4f6;">${compliance.totalMinutes.toLocaleString('en-AU')} min <span style="font-weight:400;color:#6b7280;">(target: ${compliance.targetMinutes.toLocaleString('en-AU')} min)</span></td>
                </tr>
                <tr>
                  <td style="padding:8px 12px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">RN Minutes Delivered</td>
                  <td style="padding:8px 12px;font-size:13px;font-weight:700;color:#1e293b;border-bottom:1px solid #f3f4f6;">${compliance.rnMinutes.toLocaleString('en-AU')} min <span style="font-weight:400;color:#6b7280;">(target: ${compliance.rnTargetMinutes.toLocaleString('en-AU')} min)</span></td>
                </tr>
                <tr style="background:#f8fafc;">
                  <td style="padding:8px 12px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Overall Compliance</td>
                  <td style="padding:8px 12px;font-size:13px;font-weight:700;border-bottom:1px solid #f3f4f6;">
                    <span style="color:${isCompliant ? '#16a34a' : '#d97706'};">${formatPct(compliance.compliancePct)}</span>
                    <span style="display:inline-block;margin-left:8px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:${isCompliant ? '#dcfce7' : '#fef3c7'};color:${isCompliant ? '#15803d' : '#92400e'};">${compliance.ragStatus}</span>
                  </td>
                </tr>
                ${penaltyHtml}
              </table>
            </td>
          </tr>

          <!-- AI Analysis -->
          <tr>
            <td style="background:#ffffff;padding:20px 32px 0;">
              <p style="margin:0 0 12px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#475569;">AI Analysis</p>
              <div style="background:#fafafa;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:top;padding-right:12px;">
                      <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#7c3aed);display:flex;align-items:center;justify-content:center;">
                        <span style="color:white;font-size:14px;font-weight:700;">⚡</span>
                      </div>
                    </td>
                    <td>
                      <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.04em;">CareMinutes AI</p>
                      <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${alert.message}</p>
                    </td>
                  </tr>
                </table>
              </div>
              ${gapsHtml}
              ${staffHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#ffffff;border-radius:0 0 12px 12px;padding:24px 32px;margin-top:8px;border-top:1px solid #f1f5f9;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                Sent by <strong style="color:#22c55e;">CareMinutes.ai</strong> · Australian Aged Care Compliance<br>
                This alert was generated for <strong>${facility.name}</strong> and delivered to ${toEmail}<br>
                Daily alerts are sent at 07:00 AEST · <a href="#" style="color:#22c55e;text-decoration:none;">Manage preferences</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST() {
  const apiKey   = process.env.RESEND_API_KEY;
  const fromEmail = process.env.ALERT_FROM_EMAIL;
  const toEmail   = process.env.ALERT_TO_EMAIL;

  if (!apiKey || !fromEmail || !toEmail) {
    return Response.json(
      { error: 'Missing email configuration. Check RESEND_API_KEY, ALERT_FROM_EMAIL, ALERT_TO_EMAIL in .env.local.' },
      { status: 500 }
    );
  }

  // Build compliance data for today
  const todayShifts = shiftsByDate[TODAY] || [];
  const compliance = calculateDayCompliance(todayShifts, facility.residentCount);

  // Use the most recent (today's) alert as the AI analysis content
  const alert = dummyAlerts[0];

  const html = buildEmailHtml({ alert, compliance, toEmail });

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: toEmail,
    subject: `CareMinutes.ai — Daily Compliance Alert ${facility.name}`,
    html,
  });

  if (error) {
    console.error('[alerts/send] Resend error:', error);
    return Response.json({ error: error.message || 'Failed to send email.' }, { status: 502 });
  }

  return Response.json({
    success: true,
    messageId: data?.id,
    toEmail,
    alert: {
      id: `alert-sent-${Date.now()}`,
      date: TODAY,
      status: alert.status,
      title: `AI analysis sent — ${toDisplayDate(TODAY)}`,
      message: alert.message,
      gaps: alert.gaps,
      suggestedStaff: alert.suggestedStaff,
      sentViaEmail: true,
    },
  });
}
