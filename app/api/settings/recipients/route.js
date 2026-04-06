import { getAlertRecipients, saveAlertRecipients } from '@/lib/db';
import { SEED_FACILITY_ID } from '@/lib/seedData';

const DEFAULT_EMAIL_RECIPIENTS = [
  { id: 1, email: 'jennifer@sunriseagedcare.com.au', active: true },
  { id: 2, email: 'operations@sunriseagedcare.com.au', active: true },
];
const DEFAULT_SMS_RECIPIENTS = [
  { id: 1, mobile: '0412 345 678', active: true },
];

export async function GET() {
  const { data, error } = await getAlertRecipients(SEED_FACILITY_ID);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    emailRecipients: data.email_recipients?.length ? data.email_recipients : DEFAULT_EMAIL_RECIPIENTS,
    smsRecipients:   data.sms_recipients?.length   ? data.sms_recipients   : DEFAULT_SMS_RECIPIENTS,
  });
}

export async function POST(request) {
  const { emailRecipients, smsRecipients } = await request.json();

  const { error } = await saveAlertRecipients(SEED_FACILITY_ID, {
    emailRecipients,
    smsRecipients,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
