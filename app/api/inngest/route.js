import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { dailyAlertFunction } from '@/inngest/functions/daily-alert';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [dailyAlertFunction],
});
