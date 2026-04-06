/**
 * CareMinutes.ai — Supabase database functions
 * All functions return { data, error } — callers should handle errors gracefully.
 */

import { supabase } from './supabase';

// ── Facility ──────────────────────────────────────────────────────────────────

export async function getFacility(facilityId) {
  const { data, error } = await supabase
    .from('facilities')
    .select('*')
    .eq('id', facilityId)
    .single();
  return { data, error };
}

export async function updateFacility(facilityId, updates) {
  const { data, error } = await supabase
    .from('facilities')
    .update(updates)
    .eq('id', facilityId)
    .select()
    .single();
  return { data, error };
}

// ── Staff ─────────────────────────────────────────────────────────────────────

export async function getStaff(facilityId) {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('facility_id', facilityId)
    .eq('is_active', true)
    .order('name');
  return { data: data ?? [], error };
}

export async function addStaff(facilityId, staffData) {
  const { data, error } = await supabase
    .from('staff')
    .insert({
      facility_id:     facilityId,
      name:            staffData.name,
      role:            staffData.role,
      employment_type: staffData.employmentType,
      phone:           staffData.phone || null,
      email:           staffData.email || null,
      is_active:       true,
    })
    .select()
    .single();
  return { data, error };
}

export async function updateStaff(staffId, updates) {
  const payload = {};
  if (updates.name !== undefined)           payload.name            = updates.name;
  if (updates.role !== undefined)           payload.role            = updates.role;
  if (updates.employmentType !== undefined) payload.employment_type = updates.employmentType;
  if (updates.phone !== undefined)          payload.phone           = updates.phone;
  if (updates.email !== undefined)          payload.email           = updates.email;

  const { data, error } = await supabase
    .from('staff')
    .update(payload)
    .eq('id', staffId)
    .select()
    .single();
  return { data, error };
}

export async function deleteStaff(staffId) {
  // Soft delete — mark inactive so shift history is preserved
  const { data, error } = await supabase
    .from('staff')
    .update({ is_active: false })
    .eq('id', staffId);
  return { data, error };
}

// ── Shifts ────────────────────────────────────────────────────────────────────

export async function getShifts(facilityId, startDate = null, endDate = null) {
  let query = supabase
    .from('shifts')
    .select('*')
    .eq('facility_id', facilityId)
    .order('date', { ascending: false })
    .order('start_time');

  if (startDate) query = query.gte('date', startDate);
  if (endDate)   query = query.lte('date', endDate);

  const { data, error } = await query;
  return { data: data ?? [], error };
}

export async function addShift(facilityId, shiftData) {
  const { data, error } = await supabase
    .from('shifts')
    .insert({
      facility_id:     facilityId,
      staff_id:        shiftData.staffId   || null,
      staff_name:      shiftData.staffName,
      staff_type:      shiftData.staffType,
      date:            shiftData.date,
      start_time:      shiftData.startTime,
      end_time:        shiftData.endTime,
      duration_minutes: shiftData.durationMinutes,
      employment_type: shiftData.employmentType,
    })
    .select()
    .single();
  return { data, error };
}

export async function updateShift(shiftId, updates) {
  const payload = {};
  if (updates.date             !== undefined) payload.date             = updates.date;
  if (updates.startTime        !== undefined) payload.start_time       = updates.startTime;
  if (updates.endTime          !== undefined) payload.end_time         = updates.endTime;
  if (updates.durationMinutes  !== undefined) payload.duration_minutes = updates.durationMinutes;

  const { data, error } = await supabase
    .from('shifts')
    .update(payload)
    .eq('id', shiftId)
    .select()
    .single();
  return { data, error };
}

export async function deleteShift(shiftId) {
  const { error } = await supabase
    .from('shifts')
    .delete()
    .eq('id', shiftId);
  return { error };
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export async function getAlerts(facilityId) {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('facility_id', facilityId)
    .order('date', { ascending: false });
  return { data: data ?? [], error };
}

export async function saveAlert(facilityId, alertData) {
  const { data, error } = await supabase
    .from('alerts')
    .insert({
      facility_id:    facilityId,
      date:           alertData.date,
      status:         alertData.status,
      title:          alertData.title,
      message:        alertData.message,
      gaps:           alertData.gaps           ?? [],
      suggested_staff: alertData.suggestedStaff ?? [],
      sent_via_email: alertData.sentViaEmail   ?? false,
    })
    .select()
    .single();
  return { data, error };
}

// ── Shift History ─────────────────────────────────────────────────────────────

export async function logShiftHistory(shiftId, facilityId, { changedBy, oldValues, newValues, reason }) {
  const { data, error } = await supabase
    .from('shift_history')
    .insert({
      shift_id:    shiftId,
      facility_id: facilityId,
      changed_by:  changedBy  ?? 'System',
      old_values:  oldValues  ?? {},
      new_values:  newValues  ?? {},
      reason:      reason     ?? null,
    })
    .select()
    .single();
  return { data, error };
}

export async function getShiftHistory(shiftId) {
  const { data, error } = await supabase
    .from('shift_history')
    .select('*')
    .eq('shift_id', shiftId)
    .order('changed_at', { ascending: false });
  return { data: data ?? [], error };
}

// ── Alert Recipients ──────────────────────────────────────────────────────────

export async function getAlertRecipients(facilityId) {
  const { data, error } = await supabase
    .from('facilities')
    .select('email_recipients, sms_recipients')
    .eq('id', facilityId)
    .single();
  return { data, error };
}

export async function saveAlertRecipients(facilityId, { emailRecipients, smsRecipients }) {
  const { data, error } = await supabase
    .from('facilities')
    .update({
      email_recipients: emailRecipients,
      sms_recipients:   smsRecipients,
    })
    .eq('id', facilityId)
    .select()
    .single();
  return { data, error };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Map a Supabase staff row → app format
 */
export function mapStaff(row) {
  return {
    id:             row.id,
    name:           row.name,
    role:           row.role,
    employmentType: row.employment_type,
    phone:          row.phone  ?? '',
    email:          row.email  ?? '',
    status:         row.is_active ? 'Active' : 'Inactive',
  };
}

/**
 * Map a Supabase shift row → app format
 */
export function mapShift(row) {
  return {
    id:              row.id,
    date:            row.date,
    staffId:         row.staff_id   ?? '',
    staffName:       row.staff_name,
    staffType:       row.staff_type,
    startTime:       row.start_time,
    endTime:         row.end_time,
    durationMinutes: row.duration_minutes,
    employmentType:  row.employment_type,
  };
}

/**
 * Map a Supabase alert row → app format
 */
export function mapAlert(row) {
  return {
    id:             row.id,
    date:           row.date,
    status:         row.status,
    title:          row.title,
    message:        row.message,
    gaps:           row.gaps           ?? [],
    suggestedStaff: row.suggested_staff ?? [],
    sentViaEmail:   row.sent_via_email,
  };
}

/**
 * Map a Supabase facility row → app format
 */
export function mapFacility(row) {
  return {
    id:            row.id,
    name:          row.name,
    residentCount: row.resident_count,
    managerName:   row.manager_name   ?? '',
    managerEmail:  row.manager_email  ?? '',
    managerPhone:  row.manager_phone  ?? '',
    address:       row.address        ?? '',
    state:         row.state          ?? 'NSW',
    abn:           row.abn            ?? '',
    postcode:      row.postcode       ?? '',
    anAccRate:     parseFloat(row.annacc_rate ?? 220),
    alertTime:     row.alert_time     ?? '07:00',
    emailAlerts:   row.email_alerts   ?? true,
    smsAlerts:     row.sms_alerts     ?? false,
  };
}
