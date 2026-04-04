'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle, ChevronRight, ChevronLeft, Plus, Trash2,
  Activity, Building2, User, Users, Rocket,
} from 'lucide-react';

const STATES = ['NSW','VIC','QLD','SA','WA','TAS','NT','ACT'];
const ROLES  = ['RN','EN','PCW'];
const TYPES  = ['Permanent','Casual','Agency'];
const STEPS  = ['Welcome','Facility','Manager','Staff','Ready'];

const EMPTY_STAFF = { name: '', role: 'RN', employmentType: 'Permanent', phone: '', email: '' };

export default function OnboardingPage() {
  const router  = useRouter();
  const [step,  setStep]  = useState(0); // 0-4

  // Step 2 state
  const [facName,   setFacName]   = useState('');
  const [abn,       setAbn]       = useState('');
  const [state,     setState]     = useState('NSW');
  const [address,   setAddress]   = useState('');
  const [postcode,  setPostcode]  = useState('');
  const [residents, setResidents] = useState('');

  // Step 3 state
  const [mgName,    setMgName]    = useState('');
  const [mgEmail,   setMgEmail]   = useState('');
  const [mgPhone,   setMgPhone]   = useState('');

  // Step 4 state
  const [staffList, setStaffList] = useState([]);
  const [staffForm, setStaffForm] = useState(EMPTY_STAFF);

  function addStaff() {
    if (!staffForm.name.trim()) return;
    setStaffList(prev => [...prev, { ...staffForm, id: `new-${Date.now()}` }]);
    setStaffForm(EMPTY_STAFF);
  }

  function removeStaff(id) {
    setStaffList(prev => prev.filter(s => s.id !== id));
  }

  const canProceedStep1 = facName.trim() && abn.trim() && address.trim() && postcode.length === 4 && residents;
  const canProceedStep2 = mgName.trim() && mgEmail.trim() && mgPhone.trim();
  const canProceedStep3 = staffList.length >= 3;

  function Field({ label, children }) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
        {children}
      </div>
    );
  }

  function Input({ value, onChange, placeholder, type = 'text', ...rest }) {
    return (
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder}
        {...rest}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100">
          <div
            className="h-1.5 bg-[#22c55e] transition-all duration-500"
            style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
          />
        </div>

        {/* Step indicators */}
        <div className="px-6 pt-5 pb-0">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step  ? 'bg-[#22c55e] text-white' :
                  i === step ? 'bg-[#1e293b] text-white' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-[10px] font-medium hidden sm:block ${i === step ? 'text-gray-900' : 'text-gray-400'}`}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Step 0: Welcome ── */}
        {step === 0 && (
          <div className="px-8 py-8 text-center">
            <div className="w-16 h-16 bg-[#22c55e] rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to CareMinutes.ai</h1>
            <p className="text-gray-500 mb-6 text-sm leading-relaxed">
              Australia's simplest care minutes compliance tracker for aged care facilities.
              We'll set you up in under 5 minutes.
            </p>
            <div className="space-y-3 text-left mb-8">
              {[
                ['Real-time compliance', 'Know your status in seconds every morning'],
                ['Penalty prevention', 'Never miss a care minutes target again'],
                ['One-click audit reports', 'ACQSC-ready PDF in seconds, not days'],
                ['AI shift gap alerts', 'Proactive warnings before gaps become penalties'],
              ].map(([title, desc]) => (
                <div key={title} className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-[#22c55e] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{title}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep(1)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#22c55e] text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
            >
              Get Started <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Step 1: Facility Details ── */}
        {step === 1 && (
          <div className="px-8 py-6">
            <div className="flex items-center gap-2 mb-5">
              <Building2 className="w-5 h-5 text-[#22c55e]" />
              <h2 className="text-lg font-bold text-gray-900">Facility Details</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Facility Name *">
                  <Input value={facName} onChange={e => setFacName(e.target.value)} placeholder="Sunrise Aged Care" />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="ABN *">
                  <Input value={abn} onChange={e => setAbn(e.target.value)} placeholder="12 345 678 901" />
                </Field>
              </div>
              <Field label="State *">
                <select
                  value={state}
                  onChange={e => setState(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e] bg-white"
                >
                  {STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Postcode *">
                <Input value={postcode} onChange={e => setPostcode(e.target.value.replace(/\D/,'').slice(0,4))} placeholder="2150" maxLength={4} />
              </Field>
              <div className="col-span-2">
                <Field label="Street Address *">
                  <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="42 Sunrise Boulevard, Parramatta" />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Number of Residents *">
                  <Input type="number" value={residents} onChange={e => setResidents(e.target.value)} placeholder="40" min="1" />
                </Field>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(0)} className="flex items-center gap-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#22c55e] text-white rounded-xl font-semibold hover:bg-green-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Manager Details ── */}
        {step === 2 && (
          <div className="px-8 py-6">
            <div className="flex items-center gap-2 mb-5">
              <User className="w-5 h-5 text-[#22c55e]" />
              <h2 className="text-lg font-bold text-gray-900">Manager Details</h2>
            </div>
            <div className="space-y-4">
              <Field label="Full Name *">
                <Input value={mgName} onChange={e => setMgName(e.target.value)} placeholder="Jennifer Roberts" />
              </Field>
              <Field label="Email Address *">
                <Input type="email" value={mgEmail} onChange={e => setMgEmail(e.target.value)} placeholder="jennifer@facility.com.au" />
              </Field>
              <Field label="Phone (04XX XXX XXX) *">
                <Input value={mgPhone} onChange={e => setMgPhone(e.target.value)} placeholder="0412 345 678" />
              </Field>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(1)} className="flex items-center gap-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!canProceedStep2}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#22c55e] text-white rounded-xl font-semibold hover:bg-green-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Add Staff ── */}
        {step === 3 && (
          <div className="px-8 py-6">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-5 h-5 text-[#22c55e]" />
              <h2 className="text-lg font-bold text-gray-900">Add Your Staff</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">Add at least 3 staff members to continue</p>

            {/* Add staff mini-form */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="col-span-2">
                  <Input value={staffForm.name} onChange={e => setStaffForm(f => ({...f, name: e.target.value}))} placeholder="Full name" />
                </div>
                <select value={staffForm.role} onChange={e => setStaffForm(f => ({...f, role: e.target.value}))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#22c55e]">
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
                <select value={staffForm.employmentType} onChange={e => setStaffForm(f => ({...f, employmentType: e.target.value}))} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#22c55e]">
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <button
                onClick={addStaff}
                disabled={!staffForm.name.trim()}
                className="w-full flex items-center justify-center gap-2 py-2 bg-[#1e293b] text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-40"
              >
                <Plus className="w-4 h-4" /> Add Staff Member
              </button>
            </div>

            {/* Staff list */}
            <div className="space-y-2 max-h-40 overflow-y-auto mb-2">
              {staffList.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No staff added yet</p>
              ) : staffList.map(s => (
                <div key={s.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-3 py-2">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{s.name}</span>
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-semibold ${
                      s.role === 'RN' ? 'bg-blue-100 text-blue-700' :
                      s.role === 'EN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                    }`}>{s.role}</span>
                    <span className="ml-1 text-xs text-gray-400">{s.employmentType}</span>
                  </div>
                  <button onClick={() => removeStaff(s.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Progress towards 3 minimum */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                <div className="h-1.5 bg-[#22c55e] rounded-full transition-all" style={{ width: `${Math.min(staffList.length/3,1)*100}%` }} />
              </div>
              <span className={`text-xs font-medium ${staffList.length >= 3 ? 'text-green-600' : 'text-gray-400'}`}>
                {staffList.length}/3 minimum
              </span>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex items-center gap-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!canProceedStep3}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#22c55e] text-white rounded-xl font-semibold hover:bg-green-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: You're Ready ── */}
        {step === 4 && (
          <div className="px-8 py-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Rocket className="w-8 h-8 text-[#22c55e]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">You're ready!</h2>
            <p className="text-gray-500 text-sm mb-6">Here's your setup summary</p>

            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-gray-500">Facility</span>
                <span className="font-medium text-gray-900">{facName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ABN</span>
                <span className="font-medium text-gray-900">{abn || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">State</span>
                <span className="font-medium text-gray-900">{state}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Residents</span>
                <span className="font-medium text-gray-900">{residents || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Manager</span>
                <span className="font-medium text-gray-900">{mgName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Staff added</span>
                <span className="font-medium text-green-600">{staffList.length} staff members</span>
              </div>
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#22c55e] text-white rounded-xl font-bold text-base hover:bg-green-600 transition-colors shadow-lg"
            >
              <Activity className="w-5 h-5" /> Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
