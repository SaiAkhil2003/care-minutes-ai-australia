import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'care-minutes-ai',
  eventKey: process.env.INNGEST_EVENT_KEY,
});
