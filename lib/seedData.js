/**
 * CareMinutes.ai — Seed Script
 *
 * Inserts Sunrise Aged Care demo data into Supabase.
 * Run once from the browser console or a script — it will skip if data already exists.
 *
 * Usage (browser console on any page):
 *   import { seedDatabase } from '@/lib/seedData'; await seedDatabase();
 *
 * Or call seedDatabase() from a button in the app.
 */

import { supabase } from './supabase';
import { staff as dummyStaff, shifts as dummyShifts, alerts as dummyAlerts } from './dummyData';

// The fixed facility ID used across all seeded data
export const SEED_FACILITY_ID = '00000000-0000-0000-0000-000000000001';

// Map from dummy staff IDs → UUIDs (consistent across re-seeds)
const STAFF_ID_MAP = {
  'staff-1':  '10000000-0000-0000-0000-000000000001',
  'staff-2':  '10000000-0000-0000-0000-000000000002',
  'staff-3':  '10000000-0000-0000-0000-000000000003',
  'staff-4':  '10000000-0000-0000-0000-000000000004',
  'staff-5':  '10000000-0000-0000-0000-000000000005',
  'staff-6':  '10000000-0000-0000-0000-000000000006',
  'staff-7':  '10000000-0000-0000-0000-000000000007',
  'staff-8':  '10000000-0000-0000-0000-000000000008',
  'staff-9':  '10000000-0000-0000-0000-000000000009',
  'staff-10': '10000000-0000-0000-0000-000000000010',
  'staff-11': '10000000-0000-0000-0000-000000000011',
  'staff-12': '10000000-0000-0000-0000-000000000012',
  'staff-13': '10000000-0000-0000-0000-000000000013',
  'staff-14': '10000000-0000-0000-0000-000000000014',
};

export async function seedDatabase() {
  console.log('[seed] Starting Supabase seed for Sunrise Aged Care...');

  // ── 1. Facility ─────────────────────────────────────────────────────────────
  const { error: facError } = await supabase
    .from('facilities')
    .upsert({
      id:             SEED_FACILITY_ID,
      name:           'Sunrise Aged Care',
      resident_count: 40,
      manager_name:   'Jennifer Roberts',
      manager_email:  'jennifer@sunriseagedcare.com.au',
      manager_phone:  '0412 345 678',
      address:        '42 Sunrise Boulevard',
      state:          'NSW',
      abn:            '12 345 678 901',
      postcode:       '2150',
      annacc_rate:    220,
      alert_time:     '07:00',
      email_alerts:   true,
      sms_alerts:     false,
    }, { onConflict: 'id' });

  if (facError) {
    console.error('[seed] Facility upsert failed:', facError.message);
    return { success: false, error: facError.message };
  }
  console.log('[seed] ✓ Facility seeded');

  // ── 2. Staff ────────────────────────────────────────────────────────────────
  const staffRows = dummyStaff.map(s => ({
    id:              STAFF_ID_MAP[s.id] ?? undefined,
    facility_id:     SEED_FACILITY_ID,
    name:            s.name,
    role:            s.role,
    employment_type: s.employmentType,
    phone:           s.phone  || null,
    email:           s.email  || null,
    is_active:       true,
  }));

  const { error: staffError } = await supabase
    .from('staff')
    .upsert(staffRows, { onConflict: 'id' });

  if (staffError) {
    console.error('[seed] Staff upsert failed:', staffError.message);
    return { success: false, error: staffError.message };
  }
  console.log(`[seed] ✓ ${staffRows.length} staff seeded`);

  // ── 3. Shifts ───────────────────────────────────────────────────────────────
  const shiftRows = dummyShifts.map((sh, i) => ({
    id:              `20000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`,
    facility_id:     SEED_FACILITY_ID,
    staff_id:        STAFF_ID_MAP[sh.staffId] ?? null,
    staff_name:      sh.staffName,
    staff_type:      sh.staffType,
    date:            sh.date,
    start_time:      sh.startTime,
    end_time:        sh.endTime,
    duration_minutes: sh.durationMinutes,
    employment_type: sh.employmentType,
  }));

  const { error: shiftError } = await supabase
    .from('shifts')
    .upsert(shiftRows, { onConflict: 'id' });

  if (shiftError) {
    console.error('[seed] Shifts upsert failed:', shiftError.message);
    return { success: false, error: shiftError.message };
  }
  console.log(`[seed] ✓ ${shiftRows.length} shifts seeded`);

  // ── 4. Alerts ───────────────────────────────────────────────────────────────
  const alertRows = dummyAlerts.map((a, i) => ({
    id:              `30000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`,
    facility_id:     SEED_FACILITY_ID,
    date:            a.date,
    status:          a.status,
    title:           a.title,
    message:         a.message,
    gaps:            a.gaps           ?? [],
    suggested_staff: a.suggestedStaff ?? [],
    sent_via_email:  a.sentViaEmail   ?? false,
  }));

  const { error: alertError } = await supabase
    .from('alerts')
    .upsert(alertRows, { onConflict: 'id' });

  if (alertError) {
    console.error('[seed] Alerts upsert failed:', alertError.message);
    return { success: false, error: alertError.message };
  }
  console.log(`[seed] ✓ ${alertRows.length} alerts seeded`);

  console.log('[seed] ✅ Seed complete! Facility ID:', SEED_FACILITY_ID);
  return { success: true, facilityId: SEED_FACILITY_ID };
}
