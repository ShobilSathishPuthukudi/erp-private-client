import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  Mail,
  Phone,
  Globe,
  ShieldCheck,
  FileText,
  Loader2,
  ArrowRight,
  GraduationCap,
  Building2,
  CheckCircle2,
  MapPin,
  ChevronDown,
  Sparkles,
  Users,
  Lock,
  PlusCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const COUNTRY_CODES = [
  { name: 'India', code: '+91', flag: '🇮🇳', maxLength: 10 },
  { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪', maxLength: 9 },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧', maxLength: 10 },
  { name: 'United States', code: '+1', flag: '🇺🇸', maxLength: 10 },
  { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦', maxLength: 9 },
  { name: 'Qatar', code: '+974', flag: '🇶🇦', maxLength: 8 },
  { name: 'Oman', code: '+968', flag: '🇴🇲', maxLength: 8 },
  { name: 'Kuwait', code: '+965', flag: '🇰🇼', maxLength: 8 },
  { name: 'Bahrain', code: '+973', flag: '🇧🇭', maxLength: 8 },
  { name: 'Malaysia', code: '+60', flag: '🇲🇾', maxLength: 10 },
  { name: 'Singapore', code: '+65', flag: '🇸🇬', maxLength: 8 },
  { name: 'Australia', code: '+61', flag: '🇦🇺', maxLength: 9 },
  { name: 'Canada', code: '+1', flag: '🇨🇦', maxLength: 10 },
  { name: 'Germany', code: '+49', flag: '🇩🇪', maxLength: 11 },
  { name: 'France', code: '+33', flag: '🇫🇷', maxLength: 9 },
];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

type FieldName = 'name' | 'shortName' | 'email' | 'phone' | 'website' | 'description';

interface FormState {
  name: string;
  shortName: string;
  email: string;
  phone: string;
  website: string;
  description: string;
  infrastructure: { labCapacity: string; classroomCount: string };
  interest: { universityId: string; programIds: number[] };
}

const initialForm: FormState = {
  name: '',
  shortName: '',
  email: '',
  phone: '',
  website: '',
  description: '',
  infrastructure: { labCapacity: '', classroomCount: '' },
  interest: { universityId: '', programIds: [] },
};

export default function CenterRegistration() {
  const { code } = useParams();
  const [bdeInfo, setBdeInfo] = useState<any>(null);
  const [orgInfo, setOrgInfo] = useState<any>(null);
  const [universities, setUniversities] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showCountrySelector, setShowCountrySelector] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [formData, setFormData] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (name: FieldName, value: string) => {
    let error = '';
    switch (name) {
      case 'name':
        if (!value.trim()) error = 'Center name is required';
        else if (value.length < 3) error = 'Must be at least 3 characters';
        else if (value.length > 30) error = 'Must not exceed 30 characters';
        break;
      case 'shortName':
        if (!value.trim()) error = 'Short name or city is required';
        else if (value.length < 2) error = 'Must be at least 2 characters';
        else if (value.length > 15) error = 'Must not exceed 15 characters';
        break;
      case 'email':
        if (!value.trim()) error = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Enter a valid email';
        break;
      case 'phone':
        if (!value.trim()) error = 'Phone is required';
        else if (value.replace(/\-/g, '').length !== selectedCountry.maxLength) {
          error = `Must be exactly ${selectedCountry.maxLength} digits for ${selectedCountry.name}`;
        }
        break;
      case 'website':
        if (value && value.length > 30) error = 'Must not exceed 30 characters';
        break;
      case 'description':
        if (value && value.length > 50) error = 'Must not exceed 50 characters';
        break;
      case 'interest.universityId' as any:
        if (!value) error = 'Please select a university';
        break;
      case 'interest.programIds' as any:
        if (!value || (value as any).length === 0) error = 'Select at least one program';
        break;
    }
    setErrors((prev) => ({ ...prev, [name]: error }));
    return error;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [bdeRes, orgRes, uniRes] = await Promise.allSettled([
          axios.get(`${API_URL}/public/bde-info/${code}`),
          axios.get(`${API_URL}/public/org-info`),
          axios.get(`${API_URL}/public/universities`),
        ]);
        if (bdeRes.status === 'fulfilled') setBdeInfo(bdeRes.value.data);
        else toast.error('Invalid or expired invitation link');
        if (orgRes.status === 'fulfilled') setOrgInfo(orgRes.value.data);
        if (uniRes.status === 'fulfilled') setUniversities(uniRes.value.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [code]);

  const fetchPrograms = async (uniId: string) => {
    try {
      const res = await axios.get(`${API_URL}/public/programs/${uniId}`);
      setPrograms(res.data);
    } catch {
      setPrograms([]);
    }
  };

  const handleUniversityChange = (uniId: string) => {
    setFormData((prev) => ({
      ...prev,
      interest: { universityId: uniId, programIds: [] },
    }));
    setPrograms([]);
    if (uniId) fetchPrograms(uniId);
    validateField('interest.universityId' as any, uniId);
    validateField('interest.programIds' as any, []);
  };

  const toggleProgram = (programId: number) => {
    setFormData((prev) => {
      const selected = prev.interest.programIds.includes(programId);
      const next = selected
        ? prev.interest.programIds.filter((id) => id !== programId)
        : [...prev.interest.programIds, programId];
      
      validateField('interest.programIds' as any, next);
      
      return {
        ...prev,
        interest: {
          ...prev.interest,
          programIds: next,
        },
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = ([
      'name', 'shortName', 'email', 'phone', 'website', 'description', 
      'interest.universityId', 'interest.programIds'
    ] as any[])
      .map((f) => {
        const val = f.includes('.') 
          ? f.split('.').reduce((obj: any, key: string) => obj[key], formData)
          : (formData as any)[f];
        return validateField(f, val);
      })
      .filter(Boolean);

    if (errs.length) {
      toast.error('Please fix the highlighted fields');
      return;
    }
    if (!formData.interest.universityId) {
      toast.error('Choose a primary university');
      return;
    }
    if (formData.interest.programIds.length === 0) {
      toast.error('Select at least one program');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/public/register-center`, {
        ...formData,
        phone: `${selectedCountry.code}${formData.phone}`,
        code,
      });
      setSubmitted(true);
      toast.success('Registration submitted');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit registration');
    } finally {
      setSubmitting(false);
    }
  };

  const completion = useMemo(() => {
    const required: FieldName[] = ['name', 'shortName', 'email', 'phone'];
    const filled = required.filter((f) => (formData as any)[f].toString().trim().length > 0).length;
    const hasUniversity = formData.interest.universityId ? 1 : 0;
    const hasProgram = formData.interest.programIds.length > 0 ? 1 : 0;
    return Math.round(((filled + hasUniversity + hasProgram) / (required.length + 2)) * 100);
  }, [formData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs font-semibold uppercase tracking-widest">Loading invitation</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-3xl p-10 shadow-2xl shadow-indigo-100 border border-slate-100 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Application received</h2>
          <p className="text-slate-600 leading-relaxed mb-6">
            Thanks for applying to partner with {orgInfo?.name || 'our institution'}. Our regional team
            will review your profile and reach out within 24 hours.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">What happens next</p>
            <ul className="text-sm text-slate-700 space-y-1.5">
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" /> Invitation confirmed</li>
              <li className="flex gap-2"><Loader2 className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0 animate-spin" /> Profile under review</li>
              <li className="flex gap-2"><div className="w-4 h-4 rounded-full border-2 border-slate-300 mt-0.5 shrink-0" /> Onboarding call scheduled</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none">Partner Invitation</p>
              <p className="text-sm font-bold text-slate-900">{orgInfo?.name || 'Institutional Portal'}</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <Lock className="w-3.5 h-3.5" />
            <span>Secure link · End-to-end encrypted</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        <main>
          <div className="mb-8">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-2">Partner Registration</p>
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">
              Let's get your center onboarded
            </h1>
            <p className="text-slate-600 mt-2 max-w-2xl">
              Tell us about your institution and the programs you'd like to offer. Our team will review
              your application and follow up within 24 hours.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden max-w-xs">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
                  style={{ width: `${completion}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-600 tabular-nums">{completion}% complete</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="bg-white rounded-2xl border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Building2 className="w-4.5 h-4.5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">Center identity</h2>
                  <p className="text-xs text-slate-500">How should we refer to your institution?</p>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field
                  label="Center legal name"
                  error={errors.name}
                  icon={<Building2 className="w-4 h-4 text-slate-400" />}
                >
                  <input
                    type="text"
                    required
                    maxLength={30}
                    value={formData.name}
                    placeholder="Acme Institute of Learning"
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      validateField('name', e.target.value);
                    }}
                    className={inputClass(errors.name)}
                  />
                </Field>
                <Field
                  label="Short name / city"
                  hint="Displayed in directories & dashboards"
                  error={errors.shortName}
                  icon={<MapPin className="w-4 h-4 text-slate-400" />}
                >
                  <input
                    type="text"
                    required
                    maxLength={15}
                    value={formData.shortName}
                    placeholder="DELHI / ACME"
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase().replace(/[^A-Z0-9\s\-]/g, '');
                      setFormData({ ...formData, shortName: val });
                      validateField('shortName', val);
                    }}
                    className={`${inputClass(errors.shortName)} font-mono uppercase tracking-wider`}
                  />
                </Field>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Mail className="w-4.5 h-4.5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">Primary contact</h2>
                  <p className="text-xs text-slate-500">We'll reach out on these channels</p>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field
                  label="Primary email"
                  error={errors.email}
                  icon={<Mail className="w-4 h-4 text-slate-400" />}
                >
                  <input
                    type="email"
                    required
                    value={formData.email}
                    placeholder="admin@center.edu"
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      validateField('email', e.target.value);
                    }}
                    className={inputClass(errors.email)}
                  />
                </Field>

                <Field label="Contact phone" error={errors.phone}>
                  <div className="flex gap-2">
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowCountrySelector(!showCountrySelector)}
                        className="h-full min-h-[44px] px-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition"
                      >
                        <span className="text-base leading-none">{selectedCountry.flag}</span>
                        <span className="text-sm font-semibold text-slate-700">{selectedCountry.code}</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showCountrySelector ? 'rotate-180' : ''}`} />
                      </button>
                      {showCountrySelector && (
                        <div className="absolute top-full left-0 mt-2 w-64 max-h-64 bg-white border border-slate-200 rounded-xl shadow-xl overflow-y-auto z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                          {COUNTRY_CODES.map((c) => (
                            <button
                              key={c.code + c.name}
                              type="button"
                              onClick={() => {
                                setSelectedCountry(c);
                                setShowCountrySelector(false);
                                validateField('phone', formData.phone);
                              }}
                              className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-slate-50 text-left ${selectedCountry.code === c.code ? 'bg-indigo-50/60' : ''}`}
                            >
                              <span className="text-lg leading-none">{c.flag}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-900 truncate">{c.name}</p>
                                <p className="text-[10px] text-slate-500">{c.code}</p>
                              </div>
                              {selectedCountry.code === c.code && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="relative flex-grow">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        placeholder="Phone number"
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9\-]/g, '').slice(0, selectedCountry.maxLength);
                          setFormData({ ...formData, phone: val });
                          validateField('phone', val);
                        }}
                        className={`${inputClass(errors.phone)} pl-10 font-mono`}
                      />
                    </div>
                  </div>
                </Field>

                <div className="md:col-span-2">
                  <Field
                    label="Institutional website"
                    hint="Optional"
                    error={errors.website}
                    icon={<Globe className="w-4 h-4 text-slate-400" />}
                  >
                    <input
                      type="url"
                      maxLength={30}
                      value={formData.website}
                      placeholder="https://center.edu"
                      onChange={(e) => {
                        setFormData({ ...formData, website: e.target.value });
                        validateField('website', e.target.value);
                      }}
                      className={inputClass(errors.website)}
                    />
                  </Field>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <GraduationCap className="w-4.5 h-4.5 text-amber-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">Academic interest</h2>
                  <p className="text-xs text-slate-500">Pick a university and the programs you'd like to offer</p>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <Field 
                  label="Primary university" 
                  error={errors['interest.universityId']}
                  icon={<ShieldCheck className="w-4 h-4 text-slate-400" />}
                >
                  <select
                    required
                    value={formData.interest.universityId}
                    onChange={(e) => handleUniversityChange(e.target.value)}
                    className={inputClass('')}
                  >
                    <option value="">Select an institution</option>
                    {universities.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </Field>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-slate-700">Programs of interest</label>
                    <span className="text-xs text-slate-500">
                      {formData.interest.programIds.length} selected
                    </span>
                  </div>

                  {!formData.interest.universityId ? (
                    <div className="rounded-xl border-2 border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                      Pick a university first to see available programs.
                    </div>
                  ) : programs.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500 inline mr-2" />
                      Loading programs…
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {programs.map((p) => {
                        const selected = formData.interest.programIds.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => toggleProgram(p.id)}
                            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium transition border ${
                              selected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                            }`}
                          >
                            {selected ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <PlusCircle className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            {p.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {errors['interest.programIds'] && (
                    <p className="text-xs font-medium text-rose-600 mt-2 flex items-center gap-1">
                      {errors['interest.programIds']}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
                  <FileText className="w-4.5 h-4.5 text-rose-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">About your center</h2>
                  <p className="text-xs text-slate-500">Optional, but helps us fast-track your review</p>
                </div>
              </div>
              <div className="p-6">
                <Field label="Short description" error={errors.description} hint="Max 50 characters">
                  <textarea
                    rows={3}
                    maxLength={50}
                    value={formData.description}
                    placeholder="e.g. 200-seat center with 3 labs, active since 2019"
                    onChange={(e) => {
                      setFormData({ ...formData, description: e.target.value });
                      validateField('description', e.target.value);
                    }}
                    className={`${inputClass(errors.description)} resize-none leading-relaxed`}
                  />
                </Field>
              </div>
            </section>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
              <p className="text-xs text-slate-500 leading-relaxed max-w-md">
                By submitting, you agree to our audit and verification protocols. Your information is
                shared only with authorised partnership reviewers.
              </p>
              <button
                type="submit"
                disabled={submitting || Object.values(errors).some(Boolean)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
                  </>
                ) : (
                  <>
                    Submit application <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </main>

        <aside className="space-y-5 lg:sticky lg:top-6 self-start">
          {bdeInfo && (
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl" />
              <div className="relative">
                <p className="text-[10px] font-semibold text-indigo-300 uppercase tracking-widest mb-4">
                  Invited by
                </p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center font-bold text-lg">
                    {bdeInfo.name?.charAt(0)?.toUpperCase() || 'B'}
                  </div>
                  <div>
                    <p className="font-bold">{bdeInfo.name}</p>
                    <p className="text-xs text-slate-300">Partnership Lead</p>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Reach out directly if you have questions while filling this form.
                </p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-sm">Why partner with us</h3>
            </div>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex gap-3">
                <Users className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                <span>Access to our network of universities and accredited programs</span>
              </li>
              <li className="flex gap-3">
                <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <span>Governance, audit and compliance support built-in</span>
              </li>
              <li className="flex gap-3">
                <Globe className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <span>National brand visibility and marketing collateral</span>
              </li>
            </ul>
          </div>

          <div className="bg-slate-100 rounded-2xl p-5 text-xs text-slate-600 leading-relaxed">
            <p className="font-semibold text-slate-800 mb-1">Need help?</p>
            <p>
              Email <a href="mailto:partners@institution.edu" className="text-indigo-600 font-medium">partners@institution.edu</a> and
              include your invitation code.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  icon,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700">{label}</label>
        {hint && !error && <span className="text-[11px] text-slate-400">{hint}</span>}
      </div>
      <div className="relative">
        {icon && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">{icon}</span>}
        <div className={icon ? '[&>input]:pl-10 [&>select]:pl-10 [&>textarea]:pl-10' : ''}>{children}</div>
      </div>
      {error && <p className="text-xs font-medium text-rose-600 flex items-center gap-1">{error}</p>}
    </div>
  );
}

function inputClass(error?: string) {
  return `w-full bg-white border ${
    error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-200'
  } rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition`;
}
