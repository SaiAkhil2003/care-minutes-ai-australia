'use client';

import { useState, useEffect } from 'react';
import { Save, Check, Building2, User, Bell, DollarSign, Mail, Smartphone, X, Plus, CheckCircle, AlertTriangle, Zap, ShieldCheck, ClipboardList, Trash2 } from 'lucide-react';
import { shiftTemplates as dummyTemplates } from '@/lib/dummyData';
import { facility, manager } from '@/lib/dummyData';
import { useLocalStorage } from '@/lib/useLocalStorage';

const STATES = ['NSW','VIC','QLD','SA','WA','TAS','NT','ACT'];

// Convert Australian mobile 04XX XXX XXX → +614XXXXXXXX
function toIntlPhone(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('04')) {
    return '+61' + digits.slice(1);
  }
  return phone;
}

function PhoneLink({ phone }) {
  if (!phone) return null;
  return (
    <a href={`tel:${toIntlPhone(phone)}`} className="text-blue-600 underline hover:text-blue-800 text-xs font-medium transition-colors">
      {phone}
    </a>
  );
}

const DEFAULT_EMAIL_RECIPIENTS = [
  { id: 1, email: 'jennifer@sunriseagedcare.com.au', active: true },
  { id: 2, email: 'operations@sunriseagedcare.com.au', active: true },
];
const DEFAULT_SMS_RECIPIENTS = [
  { id: 1, mobile: '0412 345 678', active: true },
];

// ── Helper components defined OUTSIDE the page component to prevent remounting on re-render ──

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-2 mb-5 pb-3 border-b border-gray-100">
        <Icon className="w-4 h-4 text-[#22c55e]" />
        <h2 className="font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

function SettingsInput({ value, onChange, placeholder, type = 'text', ...rest }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...rest}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e] transition"
    />
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div className="relative">
        <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
        <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-[#22c55e]' : 'bg-gray-200'}`} />
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`} />
      </div>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  );
}

function SmallToggle({ checked, onChange }) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer">
      <div className="relative">
        <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
        <div className={`w-8 h-4 rounded-full transition-colors duration-200 ${checked ? 'bg-[#22c55e]' : 'bg-gray-200'}`} />
        <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-4' : ''}`} />
      </div>
      <span className="text-xs text-gray-500">{checked ? 'Active' : 'Inactive'}</span>
    </label>
  );
}

function SaveButton({ saving, saved, onClick, label = 'Save Settings' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="flex items-center gap-2 px-6 py-2.5 bg-[#22c55e] text-white rounded-lg text-sm font-semibold hover:bg-green-600 active:bg-green-700 transition-colors disabled:opacity-60 shadow-sm w-full sm:w-auto justify-center"
    >
      {saving ? (
        <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
      ) : saved ? (
        <><Check className="w-4 h-4" /> Saved!</>
      ) : (
        <><Save className="w-4 h-4" /> {label}</>
      )}
    </button>
  );
}

export default function SettingsPage() {
  const [saved,   setSaved]   = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState(null);

  // Facility details — persisted to localStorage
  const [facName,     setFacName]     = useLocalStorage('cm_facName',    facility.name);
  const [abn,         setAbn]         = useLocalStorage('cm_abn',        facility.abn);
  const [state,       setState]       = useLocalStorage('cm_state',      facility.state);
  const [address,     setAddress]     = useLocalStorage('cm_address',    facility.address);
  const [postcode,    setPostcode]    = useLocalStorage('cm_postcode',   facility.postcode);
  const [residents,   setResidents]   = useLocalStorage('cm_residents',  String(facility.residentCount));

  // Manager details
  const [mgName,      setMgName]      = useLocalStorage('cm_mgName',     manager.name);
  const [mgEmail,     setMgEmail]     = useLocalStorage('cm_mgEmail',    manager.email);
  const [mgPhone,     setMgPhone]     = useLocalStorage('cm_mgPhone',    manager.phone);

  // Alert preferences
  const [alertTime,   setAlertTime]   = useLocalStorage('cm_alertTime',  '07:00');
  const [emailAlerts, setEmailAlerts] = useLocalStorage('cm_emailAlerts', true);
  const [smsAlerts,   setSmsAlerts]   = useLocalStorage('cm_smsAlerts',  false);
  const [smsPhone,    setSmsPhone]    = useLocalStorage('cm_smsPhone',   '');

  // Automated daily alert toggle
  const [autoAlertEnabled, setAutoAlertEnabled] = useLocalStorage('cm_autoAlertEnabled', true);

  // AN-ACC
  const [anAccRate,   setAnAccRate]   = useLocalStorage('cm_anAccRate',  String(facility.anAccRate));

  // ── Qualification tracking toggles (Feature 2) ──────────────────────────────
  const [trackAhpra,         setTrackAhpra]         = useLocalStorage('cm_trackAhpra',         true);
  const [trackPoliceCheck,   setTrackPoliceCheck]   = useLocalStorage('cm_trackPoliceCheck',   true);
  const [trackWwc,           setTrackWwc]           = useLocalStorage('cm_trackWwc',           true);
  const [trackFirstAid,      setTrackFirstAid]      = useLocalStorage('cm_trackFirstAid',      true);
  const [trackManualHandling,setTrackManualHandling] = useLocalStorage('cm_trackManualHandling',true);
  const [trackCovid,         setTrackCovid]         = useLocalStorage('cm_trackCovid',         false);

  // ── Shift Templates (Feature 3) ─────────────────────────────────────────────
  const [templates, setTemplates] = useLocalStorage('cm_shiftTemplates', dummyTemplates);
  function deleteTemplate(id) {
    setTemplates(prev => prev.filter(t => t.id !== id));
  }

  // ── Alert Recipients ────────────────────────────────────────────────────────
  const [emailRecipients,  setEmailRecipients]  = useState(DEFAULT_EMAIL_RECIPIENTS);
  const [smsRecipients,    setSmsRecipients]    = useState(DEFAULT_SMS_RECIPIENTS);
  const [newEmail,         setNewEmail]         = useState('');
  const [emailError,       setEmailError]       = useState('');
  const [newMobile,        setNewMobile]        = useState('');
  const [mobileError,      setMobileError]      = useState('');
  const [recipientsSaved,  setRecipientsSaved]  = useState(false);
  const [recipientsSaving, setRecipientsSaving] = useState(false);
  const [recipientsLoading, setRecipientsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch('/api/settings/recipients')
      .then(r => r.json())
      .then(data => {
        if (data.emailRecipients) setEmailRecipients(data.emailRecipients);
        if (data.smsRecipients)   setSmsRecipients(data.smsRecipients);
      })
      .catch(() => {})
      .finally(() => setRecipientsLoading(false));
  }, []);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      showToast('Settings saved successfully');
      setTimeout(() => setSaved(false), 3000);
    }, 800);
  }

  // ── Email recipient handlers ──────────────────────────────────────────────
  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  function addEmail() {
    const trimmed = newEmail.trim();
    if (!validateEmail(trimmed)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    if (emailRecipients.length >= 5) {
      setEmailError('Maximum 5 email recipients allowed.');
      return;
    }
    if (emailRecipients.some(r => r.email.toLowerCase() === trimmed.toLowerCase())) {
      setEmailError('This email address is already in the list.');
      return;
    }
    setEmailRecipients(prev => [...prev, { id: Date.now(), email: trimmed, active: true }]);
    setNewEmail('');
    setEmailError('');
  }

  function removeEmail(id) {
    setEmailRecipients(prev => prev.filter(r => r.id !== id));
  }

  function toggleEmail(id) {
    setEmailRecipients(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
  }

  // ── SMS recipient handlers ────────────────────────────────────────────────
  function validateMobile(mobile) {
    return /^04\d{2}\s?\d{3}\s?\d{3}$/.test(mobile.trim());
  }

  function addMobile() {
    const trimmed = newMobile.trim();
    if (!validateMobile(trimmed)) {
      setMobileError('Enter a valid Australian mobile number (04XX XXX XXX).');
      return;
    }
    if (smsRecipients.length >= 3) {
      setMobileError('Maximum 3 SMS recipients allowed.');
      return;
    }
    if (smsRecipients.some(r => r.mobile.replace(/\s/g,'') === trimmed.replace(/\s/g,''))) {
      setMobileError('This mobile number is already in the list.');
      return;
    }
    setSmsRecipients(prev => [...prev, { id: Date.now(), mobile: trimmed, active: true }]);
    setNewMobile('');
    setMobileError('');
  }

  function removeMobile(id) {
    setSmsRecipients(prev => prev.filter(r => r.id !== id));
  }

  function toggleMobile(id) {
    setSmsRecipients(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
  }

  async function handleRecipientsSave() {
    setRecipientsSaving(true);
    try {
      const res = await fetch('/api/settings/recipients', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ emailRecipients, smsRecipients }),
      });
      if (!res.ok) throw new Error('Save failed');
      setRecipientsSaved(true);
      showToast('Recipients saved successfully');
      setTimeout(() => setRecipientsSaved(false), 3000);
    } catch {
      showToast('Failed to save recipients', 'error');
    } finally {
      setRecipientsSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">

      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Facility Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your facility configuration and preferences</p>
      </div>

      <form onSubmit={handleSave}>

        {/* ── Facility Details ── */}
        <SectionCard icon={Building2} title="Facility Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Facility Name">
                <SettingsInput value={facName} onChange={e => setFacName(e.target.value)} placeholder="Sunrise Aged Care" />
              </Field>
            </div>
            <Field label="ABN">
              <SettingsInput value={abn} onChange={e => setAbn(e.target.value)} placeholder="12 345 678 901" />
            </Field>
            <Field label="State">
              <select
                value={state}
                onChange={e => setState(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e] bg-white"
              >
                {STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Street Address">
                <SettingsInput value={address} onChange={e => setAddress(e.target.value)} placeholder="42 Sunrise Boulevard" />
              </Field>
            </div>
            <Field label="Postcode (4 digits)">
              <SettingsInput
                value={postcode}
                onChange={e => setPostcode(e.target.value.replace(/\D/,'').slice(0,4))}
                placeholder="2150"
                maxLength={4}
              />
            </Field>
            <Field label="Number of Residents">
              <SettingsInput
                type="number"
                value={residents}
                onChange={e => setResidents(e.target.value)}
                placeholder="40"
                min="1" max="500"
              />
            </Field>
          </div>
        </SectionCard>

        {/* ── Manager Details ── */}
        <SectionCard icon={User} title="Manager Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Manager Name">
                <SettingsInput value={mgName} onChange={e => setMgName(e.target.value)} placeholder="Jennifer Roberts" />
              </Field>
            </div>
            <Field label="Email Address">
              <SettingsInput type="email" value={mgEmail} onChange={e => setMgEmail(e.target.value)} placeholder="jennifer@facility.com.au" />
            </Field>
            <Field label="Phone (04XX XXX XXX)">
              <SettingsInput value={mgPhone} onChange={e => setMgPhone(e.target.value)} placeholder="0412 345 678" />
              {mgPhone && (
                <p className="mt-1">
                  <PhoneLink phone={mgPhone} /> <span className="text-xs text-gray-400">(tap to call)</span>
                </p>
              )}
            </Field>
          </div>
        </SectionCard>

        {/* ── Alert Preferences ── */}
        <SectionCard icon={Bell} title="Alert Preferences">
          <div className="space-y-4">
            <Field label="Daily Alert Time (AEST)" hint="AI gap analysis is sent to your email at this time each morning">
              <input
                type="time"
                value={alertTime}
                onChange={e => setAlertTime(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e] w-full sm:w-auto"
              />
            </Field>
            <div className="space-y-3">
              <Toggle
                checked={emailAlerts}
                onChange={() => setEmailAlerts(v => !v)}
                label="Email alerts"
              />
              <Toggle
                checked={smsAlerts}
                onChange={() => setSmsAlerts(v => !v)}
                label="SMS alerts (Growth plan only)"
              />
            </div>
            {smsAlerts && (
              <Field label="SMS Phone Number">
                <SettingsInput
                  value={smsPhone}
                  onChange={e => setSmsPhone(e.target.value)}
                  placeholder="0412 345 678"
                />
              </Field>
            )}
          </div>
        </SectionCard>

        {/* ── Automated Daily Alert ── */}
        <SectionCard icon={Zap} title="Automated Daily Alert">
          <p className="text-sm text-gray-500 mb-5">
            Automatically send a compliance summary email every morning at 07:00 AEST
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Toggle
              checked={autoAlertEnabled}
              onChange={() => setAutoAlertEnabled(v => !v)}
              label={autoAlertEnabled ? 'Automated alerts enabled' : 'Automated alerts disabled'}
            />
            {autoAlertEnabled ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200 w-fit">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Active — sends daily at 07:00 AEST
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200 w-fit">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                Disabled — manual alerts only
              </span>
            )}
          </div>
        </SectionCard>

        {/* ── AN-ACC Settings ── */}
        <SectionCard icon={DollarSign} title="AN-ACC Settings">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="AN-ACC Rate per Resident (AUD/day)" hint="Default: $220.00. Update if your Base Care Tariff changes.">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  value={anAccRate}
                  onChange={e => setAnAccRate(e.target.value)}
                  step="0.01"
                  min="0"
                  className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                />
              </div>
            </Field>
            <div className="flex items-end pb-0.5">
              <div className="bg-blue-50 rounded-lg p-3 w-full">
                <p className="text-xs text-blue-600 font-medium">Daily subsidy preview</p>
                <p className="text-lg font-bold text-blue-800 mt-0.5">
                  ${(parseFloat(anAccRate || 0) * parseInt(residents || 40)).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-blue-500">{residents} residents × ${parseFloat(anAccRate || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── Save Button ── */}
        <div className="flex justify-end mb-8">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#22c55e] text-white rounded-lg text-sm font-semibold hover:bg-green-600 active:bg-green-700 transition-colors disabled:opacity-60 shadow-sm w-full sm:w-auto justify-center"
          >
            {saving ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
            ) : saved ? (
              <><Check className="w-4 h-4" /> Settings Saved!</>
            ) : (
              <><Save className="w-4 h-4" /> Save Settings</>
            )}
          </button>
        </div>
      </form>

      {/* ── Alert Recipients ───────────────────────────────────────────────── */}
      <SectionCard icon={Mail} title="Alert Recipients">
        <p className="text-sm text-gray-500 mb-5">
          Add email addresses and mobile numbers to receive daily compliance alerts at 07:00 AEST
        </p>

        {/* Email Recipients */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-3.5 h-3.5 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Email Recipients</h3>
            <span className="text-xs text-gray-400">({mounted ? emailRecipients.length : 0}/5)</span>
          </div>

          <div className="flex gap-2 mb-2">
            <input
              type="email"
              value={newEmail}
              onChange={e => { setNewEmail(e.target.value); setEmailError(''); }}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addEmail())}
              placeholder="Email address"
              className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e] transition"
            />
            <button
              type="button"
              onClick={addEmail}
              disabled={emailRecipients.length >= 5}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#22c55e] text-white rounded-lg text-sm font-medium hover:bg-green-600 active:bg-green-700 transition-colors disabled:opacity-40 shrink-0"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          {emailError && <p className="text-xs text-red-500 mb-2">{emailError}</p>}

          {emailRecipients.length > 0 && (
            <div className="space-y-2 mt-3">
              {emailRecipients.map(r => (
                <div key={r.id} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-700 truncate">{r.email}</span>
                  </div>
                  <div className="flex items-center gap-3 ml-3 shrink-0">
                    <SmallToggle checked={r.active} onChange={() => toggleEmail(r.id)} />
                    <button
                      type="button"
                      onClick={() => removeEmail(r.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SMS Recipients */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Smartphone className="w-3.5 h-3.5 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">SMS Recipients</h3>
            <span className="text-xs text-gray-400">({mounted ? smsRecipients.length : 0}/3)</span>
          </div>

          <div className="flex gap-2 mb-2">
            <input
              type="tel"
              value={newMobile}
              onChange={e => { setNewMobile(e.target.value); setMobileError(''); }}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addMobile())}
              placeholder="04XX XXX XXX"
              className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e] transition"
            />
            <button
              type="button"
              onClick={addMobile}
              disabled={smsRecipients.length >= 3}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#22c55e] text-white rounded-lg text-sm font-medium hover:bg-green-600 active:bg-green-700 transition-colors disabled:opacity-40 shrink-0"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          {mobileError && <p className="text-xs text-red-500 mb-2">{mobileError}</p>}

          {smsRecipients.length > 0 && (
            <div className="space-y-2 mt-3">
              {smsRecipients.map(r => (
                <div key={r.id} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <Smartphone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-sm truncate"><PhoneLink phone={r.mobile} /></span>
                  </div>
                  <div className="flex items-center gap-3 ml-3 shrink-0">
                    <SmallToggle checked={r.active} onChange={() => toggleMobile(r.id)} />
                    <button
                      type="button"
                      onClick={() => removeMobile(r.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <SaveButton saving={recipientsSaving} saved={recipientsSaved} onClick={handleRecipientsSave} label="Save Settings" />
        </div>
      </SectionCard>

      {/* ── Qualification Tracking (Feature 2) ── */}
      <SectionCard icon={ShieldCheck} title="Qualification Tracking">
        <p className="text-xs text-gray-500 mb-4">
          Select which qualifications to track for expiry alerts. Alerts are sent 90, 60, 30 and 7 days before expiry.
        </p>
        <div className="space-y-3">
          {[
            { label: 'AHPRA Registration',    hint: 'Mandatory for RN and EN staff',  value: trackAhpra,          set: setTrackAhpra          },
            { label: 'Police Check',          hint: 'Required for all care staff',     value: trackPoliceCheck,    set: setTrackPoliceCheck    },
            { label: 'Working With Children', hint: 'Required in most states',         value: trackWwc,            set: setTrackWwc            },
            { label: 'First Aid Certificate', hint: 'Annual renewal recommended',      value: trackFirstAid,       set: setTrackFirstAid       },
            { label: 'Manual Handling',       hint: 'Annual competency check',         value: trackManualHandling, set: setTrackManualHandling },
            { label: 'COVID Vaccination',     hint: 'Track vaccination date only',     value: trackCovid,          set: setTrackCovid          },
          ].map(({ label, hint, value, set }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-400">{hint}</p>
              </div>
              <Toggle checked={value} onChange={e => set(e.target.checked)} />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Shift Templates (Feature 3) ── */}
      <SectionCard icon={ClipboardList} title="Shift Templates">
        <p className="text-xs text-gray-500 mb-4">
          Manage saved shift templates. Apply templates from the Shifts page to quickly populate a week.
        </p>
        {(!templates || templates.length === 0) ? (
          <div className="text-center py-8 text-gray-400">
            <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No templates saved yet.</p>
            <p className="text-xs mt-1">Use "Save Week as Template" on the Shifts page.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map(t => (
              <div key={t.id} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{t.name}</p>
                  {t.description && <p className="text-xs text-gray-500 truncate">{t.description}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t.shifts?.length || 0} shifts ·
                    Created {new Date(t.createdAt + 'T00:00:00').toLocaleDateString('en-AU', { day:'2-digit', month:'2-digit', year:'numeric' })}
                  </p>
                </div>
                <button
                  onClick={() => deleteTemplate(t.id)}
                  className="p-1.5 bg-red-50 text-red-500 rounded hover:bg-red-100 transition-colors shrink-0"
                  title="Delete template"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-24 md:bottom-6 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-50 flex items-start gap-3 px-4 py-3.5 rounded-xl shadow-lg border text-sm font-medium md:max-w-sm
          ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}
        >
          {toast.type === 'error'
            ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            : <CheckCircle   className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
          }
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => setToast(null)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity ml-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
}
