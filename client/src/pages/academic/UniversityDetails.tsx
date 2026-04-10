import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { 
  Building2, 
  MapPin, 
  Globe, 
  Mail, 
  Phone, 
  Edit2, 
  ArrowLeft,
  ShieldCheck,
  Calendar,
  Users,
  BookOpen,
  Layout,
  ExternalLink,
  Printer,
  Share2,
  FileText,
  X
} from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

interface University {
  id: number;
  name: string;
  shortName?: string;
  status: string;
  accreditation?: string;
  websiteUrl?: string;
  email?: string;
  phone?: string;
  address?: string;
  ugcRegistrationNumber?: string;
  affiliationDate?: string;
  governanceStructure?: string;
  operationalDomain?: string;
  logoUrl?: string;
  totalPrograms?: number;
  totalDepartments?: number;
  totalStudents?: number;
}

export default function UniversityDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [university, setUniversity] = useState<University | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const fetchUniversity = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/academic/universities/${id}`);
      setUniversity(res.data);
      reset({
        name: res.data.name,
        shortName: res.data.shortName || '',
        ugcRegistrationNumber: res.data.ugcRegistrationNumber || '',
        affiliationDate: res.data.affiliationDate || '',
        governanceStructure: res.data.governanceStructure || '',
        operationalDomain: res.data.operationalDomain || '',
        logoUrl: res.data.logoUrl || ''
      });
    } catch (error) {
      toast.error('Failed to load institutional profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUniversity();
  }, [id]);

  const onUpdate = async (data: any) => {
    try {
      await api.put(`/academic/universities/${id}`, data);
      toast.success('Institutional profile synchronized');
      setIsEditModalOpen(false);
      fetchUniversity();
    } catch (error) {
      toast.error('Failed to update node');
    }
  };

  if (isLoading) return <div className="p-8">Loading infrastructure...</div>;
  if (!university) return <div className="p-8 text-rose-500 font-black uppercase">Institutional Node Not Found</div>;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Layout },
    { id: 'departments', label: `Departments (${university.totalDepartments || 0})`, icon: Building2 },
    { id: 'programs', label: `Programs (${university.totalPrograms || 0})`, icon: BookOpen },
    { id: 'governance', label: 'Governance', icon: ShieldCheck },
    { id: 'legal', label: 'Legal Binding', icon: FileText },
  ];

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto p-4 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Partner Details</h1>
          <p className="text-slate-500 font-medium text-sm">Institutional Profile & Affiliation Governance Management</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all border border-slate-200">
            <Printer className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all border border-slate-200">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Back to Registry Button */}
      <div>
        <button 
          onClick={() => navigate('/dashboard/academic/universities')}
          className="flex items-center gap-2 px-6 py-2.5 bg-white text-slate-600 rounded-xl border border-slate-200 font-bold text-sm hover:bg-slate-50 transition-all group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Registry
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-8">
          {/* Main Info Card */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              {/* Logo Placeholder */}
              <div className="w-32 h-32 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-center p-4 shadow-inner relative overflow-hidden group">
                {university.logoUrl ? (
                  <img src={university.logoUrl} alt={university.name} className="w-full h-full object-contain" />
                ) : (
                  <Building2 className="w-12 h-12 text-slate-200" />
                )}
                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer">
                    <Edit2 className="w-6 h-6 text-white" />
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-4">
                  <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{university.name}</h2>
                </div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-8 text-[10px] font-black uppercase tracking-[0.1em]">
                  <span className="px-3 py-1 bg-slate-50 text-slate-600 rounded-lg border border-slate-100">{university.shortName || 'UNIV-ID'}</span>
                  {(() => {
                    const s = university.status?.toLowerCase();
                    const config = {
                      proposed: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', dot: 'bg-amber-500' },
                      draft: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', dot: 'bg-blue-500' },
                      staged: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', dot: 'bg-indigo-500' },
                      active: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', dot: 'bg-emerald-500' },
                      inactive: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', dot: 'bg-rose-500' }
                    }[s] || { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100', dot: 'bg-slate-500' };

                    return (
                      <span className={`px-3 py-1 ${config.bg} ${config.text} rounded-lg border ${config.border} flex items-center gap-1.5`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
                        {university.status || 'PROPOSED'}
                      </span>
                    );
                  })()}
                </div>

                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                  <button 
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 group"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Profile
                  </button>
                  <button className="flex items-center gap-2 px-8 py-3 bg-white text-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest border border-blue-600 hover:bg-blue-50 transition-all">
                    Affiliation Manual
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tabbed Navigation */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="flex border-b border-slate-100 px-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-6 text-[10px] font-black uppercase tracking-widest transition-all relative ${
                    activeTab === tab.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-6 right-6 h-1 bg-blue-600 rounded-t-full shadow-lg shadow-blue-200" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-10">
              {activeTab === 'overview' && (
                <div className="space-y-12">
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                        <Layout className="w-6 h-6 text-blue-600" />
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Institutional Profile</h3>
                    </div>
                    <p className="text-slate-500 font-medium leading-relaxed max-w-4xl">
                        A registered academic institution within the Academic Management System, contributing to quality education and structured academic programs. This profile captures the institutional capacity, accreditation status, and operational reach of the partner university.
                    </p>
                  </section>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="w-5 h-5 text-blue-600" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registry Status</p>
                      </div>
                      <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        Profile Verified & Integrated
                      </div>
                    </div>

                    <div className="space-y-6 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contract Lifecycle</p>
                      </div>
                      <div className="text-sm font-bold text-slate-700">
                        Bound until {university.affiliationDate || 'TBD'}
                      </div>
                    </div>

                    <div className="space-y-6 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="w-5 h-5 text-blue-600" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Security Locking</p>
                      </div>
                      <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
                         <div className="w-2 h-2 rounded-full bg-blue-500" />
                         Governance Controls Active
                      </div>
                    </div>

                    <div className="space-y-6 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-blue-600" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Audit</p>
                      </div>
                      <div className="text-sm font-bold text-slate-700">
                        2 hours ago by System
                      </div>
                    </div>
                  </div>

                  <section>
                    <div className="flex items-center gap-3 mb-6">
                        <ShieldCheck className="w-6 h-6 text-blue-600" />
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Regulatory Compliance</h3>
                    </div>
                    <div className="p-8 bg-blue-50 rounded-[2rem] border border-blue-100">
                        <p className="text-blue-700 font-medium text-sm ">
                            "Institutional compliance data is automatically synchronized from the registrar's ledger."
                        </p>
                    </div>
                  </section>
                </div>
              )}
              {activeTab !== 'overview' && (
                <div className="text-center py-20 grayscale opacity-40">
                  <Building2 className="w-20 h-20 mx-auto mb-6 text-slate-300" />
                  <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Matrix Segment Pending</h3>
                  <p className="text-sm text-slate-300 font-medium mt-2">Extended ledger integration required for deep-dive telemetry.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="lg:col-span-4 space-y-8">
          {/* Quick Contacts */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Primary Contacts</h3>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                  <Mail className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Email Pipeline</p>
                  <p className="text-sm font-bold text-slate-900">{university.email || 'reg@university.edu'}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                  <Phone className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Voice Protocol</p>
                  <p className="text-sm font-bold text-slate-900">{university.phone || '+91 1724317431'}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                  <Globe className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Institutional Host</p>
                  <a href={university.websiteUrl} target="_blank" className="text-sm font-bold text-blue-600 flex items-center gap-1.5 hover:underline decoration-2">
                    {university.websiteUrl?.replace('https://', '') || 'www.university.edu'}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4 pt-6 border-t border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                  <MapPin className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Geographic Origin</p>
                  <p className="text-xs font-medium text-slate-600 leading-normal">
                    {university.address || 'Administrative Block, University Campus, Delhi NCR, India'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Academic Stats */}
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-slate-900/30">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Academics & Population</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-sm">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Departments</p>
                <p className="text-3xl font-black leading-none">{university.totalDepartments || 0}</p>
              </div>
              <div className="p-6 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-sm">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Programs</p>
                <p className="text-3xl font-black leading-none">{university.totalPrograms || 0}</p>
              </div>
              <div className="p-6 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-sm">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Students</p>
                <p className="text-3xl font-black leading-none">{university.totalStudents || 0}</p>
              </div>
              <div className="p-6 bg-indigo-600 rounded-3xl border border-indigo-500/50">
                <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-2">Affiliations</p>
                <p className="text-3xl font-black leading-none">1</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit University Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        hideHeader={true}
        maxWidth="2xl"
      >
        <div className="bg-white overflow-hidden flex flex-col max-h-[calc(100vh-160px)]">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Update University Profile</h2>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-xl transition-colors"
                >
                    <X className="w-5 h-5 text-slate-400" />
                </button>
            </div>

            <form onSubmit={handleSubmit(onUpdate)} className="flex flex-col flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                    {/* Institutional Identity */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-blue-600" />
                            </div>
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Institutional Identity</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Legal University Name *</label>
                                <input {...register('name', { required: true })} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/5 focus:border-blue-600 text-sm font-bold text-slate-900 transition-all" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">University Short Name</label>
                                <input {...register('shortName')} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/5 focus:border-blue-600 text-sm font-bold text-slate-900 transition-all uppercase" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">UGC Registration Number *</label>
                                <input {...register('ugcRegistrationNumber', { required: true })} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/5 focus:border-blue-600 text-sm font-bold text-slate-900 transition-all" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Affiliation Start Date</label>
                                <div className="relative">
                                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input type="date" {...register('affiliationDate')} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/5 focus:border-blue-600 text-sm font-bold text-slate-900 transition-all" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Governance Structure</label>
                                <input {...register('governanceStructure')} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/5 focus:border-blue-600 text-sm font-bold text-slate-900 transition-all" placeholder="Board Managed / Private" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Operational Domain</label>
                                <input {...register('operationalDomain')} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/5 focus:border-blue-600 text-sm font-bold text-slate-900 transition-all" placeholder="Higher Education (HEI)" />
                            </div>
                        </div>
                    </div>

                    {/* Institutional Branding */}
                    <div className="space-y-6 pt-6 border-t border-slate-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                                <Layout className="w-5 h-5 text-indigo-600" />
                            </div>
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Institutional Branding</h3>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Logo External URL</label>
                            <input {...register('logoUrl')} className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600/5 focus:border-blue-600 text-sm font-bold text-slate-900 transition-all" placeholder="https://..." />
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                    <button 
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="px-8 py-3.5 bg-white text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-200 hover:bg-slate-100 transition-all"
                    >
                        Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="px-10 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                        {isSubmitting ? 'Synchronizing...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
      </Modal>
    </div>
  );
}
