import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
  Send, 
  Layout, 
  Building, 
  BookOpen, 
  Plus, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  History,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { PageHeader } from '@/components/shared/PageHeader';
import { Modal } from '@/components/shared/Modal';

interface AccreditationRequest {
  id: number;
  courseName: string;
  universityName: string;
  type: string;
  status: 'pending' | 'finance_pending' | 'approved' | 'rejected';
  remarks?: string;
  createdAt: string;
}

export default function AccreditationInterest() {
    const [requests, setRequests] = useState<AccreditationRequest[]>([]);
    const [entities, setEntities] = useState<{ universities: any[], subDepts: any[] }>({ universities: [], subDepts: [] });
    const [existingPrograms, setExistingPrograms] = useState<any[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<AccreditationRequest | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    
    const { register, handleSubmit, reset, formState: { errors } } = useForm();

    const fetchRequests = async () => {
        try {
            setIsLoading(true);
            const [reqRes, entRes] = await Promise.all([
                api.get('/portals/partner-center/accreditation-requests'),
                api.get('/portals/partner-center/entities')
            ]);
            setRequests(reqRes.data);
            setEntities(entRes.data);

            if (entRes.data.universities?.[0]?.id) {
                try {
                    const progRes = await api.get(`/public/programs/${entRes.data.universities[0].id}`);
                    setExistingPrograms(progRes.data);
                } catch (e) {
                    console.error('Failed to fetch existing programs', e);
                }
            }
        } catch (error) {
            console.error('Fetch requests error:', error);
            toast.error('Failed to synchronize accreditation history');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const onSubmit = async (data: any) => {
        try {
            setIsSubmitting(true);
            await api.post('/accreditation/request', data);
            toast.success('Interest request broadcasted to Sub-Department Admins');
            setIsModalOpen(false);
            reset();
            fetchRequests();
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Broadcasting protocol failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'approved':
                return { 
                    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
                    icon: CheckCircle2,
                    label: 'Institutional Approval'
                };
            case 'rejected':
                return { 
                    bg: 'bg-rose-50 text-rose-700 border-rose-200', 
                    icon: XCircle,
                    label: 'Request Declined'
                };
            case 'finance_pending':
                return { 
                    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', 
                    icon: Clock,
                    label: 'Finance Ratification'
                };
            default:
                return { 
                    bg: 'bg-amber-50 text-amber-700 border-amber-200', 
                    icon: Clock,
                    label: 'Operations Review'
                };
        }
    };

    return (
        <div className="p-8 space-y-10 max-w-[1600px] mx-auto min-h-screen">
            <PageHeader 
                title="Accreditation Management"
                description="Monitor and initiate institutional tie-up protocols for approved university programs."
                icon={Building}
                action={
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Initiate Request
                    </button>
                }
            />

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-4 animate-pulse">
                            <div className="w-16 h-16 bg-slate-100 rounded-2xl" />
                            <div className="h-6 bg-slate-100 rounded-full w-3/4" />
                            <div className="h-4 bg-slate-50 rounded-full w-1/2" />
                        </div>
                    ))}
                </div>
            ) : requests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {requests.map((request) => {
                        const style = getStatusStyles(request.status);
                        const StatusIcon = style.icon;
                        return (
                            <div 
                                key={request.id} 
                                onClick={() => {
                                    setSelectedRequest(request);
                                    setIsDetailsOpen(true);
                                }}
                                className="group relative bg-white border border-slate-200 rounded-[3rem] p-8 hover:border-slate-900 hover:shadow-2xl hover:shadow-slate-900/5 transition-all duration-500 overflow-hidden cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-8">
                                    <div className="w-20 h-20 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500 shadow-inner group-hover:scale-105">
                                        <BookOpen className="w-10 h-10" />
                                    </div>
                                    <div className={`flex flex-col items-end gap-2`}>
                                        <span className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-full border shadow-sm ${style.bg}`}>
                                            {style.label}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                            <History className="w-3 h-3" />
                                            {new Date(request.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="font-black text-slate-900 text-2xl leading-tight group-hover:text-slate-900 transition-colors uppercase tracking-tighter mb-1.5">{request.courseName}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest">{request.type} UNIT</span>
                                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{request.universityName}</span>
                                        </div>
                                    </div>

                                    {request.remarks && (
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] font-medium text-slate-500 italic">
                                            "{request.remarks}"
                                        </div>
                                    )}

                                    <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`h-2.5 w-2.5 rounded-full ${request.status === 'approved' ? 'bg-emerald-500 shadow-emerald-500/20 shadow-lg' : 'bg-amber-500 shadow-amber-500/20 shadow-lg'}`} />
                                            <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">{request.status.replace('_', ' ')}</span>
                                        </div>
                                        <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                                            <ArrowRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-[4rem] p-24 text-center space-y-8 shadow-inner shadow-slate-50">
                    <div className="relative inline-flex">
                        <div className="absolute inset-0 bg-slate-100 rounded-[2.5rem] blur-2xl opacity-50" />
                        <div className="relative w-28 h-28 bg-white border border-slate-100 rounded-[2.5rem] shadow-xl flex items-center justify-center text-slate-300">
                            <History className="w-12 h-12" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">No Request History</h3>
                        <p className="text-slate-400 max-w-sm mx-auto font-medium text-lg leading-relaxed lowercase tracking-tight italic">your institutional accreditation queue is currently empty. initiate a request to begin the deployment protocol.</p>
                    </div>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="px-10 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-slate-900/30 hover:scale-105 active:scale-95 transition-all"
                    >
                        Initiate Deployment
                    </button>
                </div>
            )}

            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                title="Accreditation Interest"
                maxWidth="2xl"
            >
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 p-4">
                    <div className="bg-slate-900 text-white p-8 rounded-[2rem] relative overflow-hidden shadow-2xl shadow-slate-900/20 mb-8">
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                            <Building className="w-24 h-24" />
                        </div>
                        <h2 className="text-2xl font-black tracking-tighter uppercase mb-1">New Program Request</h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Request institutional tie-ups for existing frameworks.</p>
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                <BookOpen className="w-4 h-4 text-slate-900" />
                                Proposed Program Designation
                            </label>
                            <input 
                                {...register('courseName', { 
                                    required: 'Proposed Program Designation is required',
                                    minLength: { value: 3, message: 'Must be between 3 and 20 characters' },
                                    maxLength: { value: 20, message: 'Must be between 3 and 20 characters' },
                                    validate: (value) => {
                                        if (existingPrograms.some(p => p.name.toLowerCase() === value.toLowerCase())) {
                                            return 'Program already defined for this university';
                                        }
                                        if (requests.some(r => r.courseName.toLowerCase() === value.toLowerCase())) {
                                            return 'A request for this program already exists';
                                        }
                                        return true;
                                    }
                                })}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-8 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-sm placeholder:text-slate-300"
                                placeholder="Diploma in Computer Architecture"
                            />
                            {errors.courseName && (
                                <p className="text-red-500 text-xs font-bold mt-1 px-1">
                                    {errors.courseName.message as string}
                                </p>
                            )}
                        </div>

                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                <Building className="w-4 h-4 text-slate-900" />
                                Assigned Institutional University
                            </label>
                            <div className="w-full px-6 py-5 bg-indigo-50 border border-indigo-100 rounded-3xl flex items-center justify-between">
                                <span className="font-black text-indigo-900 uppercase tracking-tight">
                                    {entities.universities[0]?.name || 'Fetching Assignment...'}
                                </span>
                                <span className="bg-indigo-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Fixed Partner</span>
                                <input type="hidden" value={entities.universities[0]?.name || ''} {...register('universityName', { required: 'University is required' })} />
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 mt-2 italic px-1">
                                program deployment is strictly limited to your authorized parent university.
                            </p>
                            {errors.universityName && (
                                <p className="text-red-500 text-xs font-bold mt-1 px-1">
                                    {errors.universityName.message as string}
                                </p>
                            )}
                        </div>

                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                                <Layout className="w-4 h-4 text-slate-900" />
                                Deployment Sub-Department
                            </label>
                            <select 
                                {...register('type', { required: 'Deployment Sub-Department is required' })}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-8 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-sm select-none"
                            >
                                <option value="">Select Academic Unit</option>
                                {entities.subDepts.map(sd => (
                                    <option key={sd.id} value={sd.name}>{sd.name}</option>
                                ))}
                            </select>
                            {errors.type && (
                                <p className="text-red-500 text-xs font-bold mt-1 px-1">
                                    {errors.type.message as string}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100 uppercase">
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black text-xs tracking-[0.3em] hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-slate-900/30"
                        >
                            {isSubmitting ? "Broadcasting..." : <><Send className="w-4 h-4" /> Initiate Request Protocol</>}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Details Modal */}
            <Modal
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                title="Request Examination"
                maxWidth="2xl"
            >
                {selectedRequest && (() => {
                    const style = getStatusStyles(selectedRequest.status);
                    const StatusIcon = style.icon;
                    return (
                        <div className="space-y-10 p-4">
                            <div className="flex items-center gap-6">
                                <div className="w-24 h-24 rounded-[2.5rem] bg-slate-900 text-white flex items-center justify-center shadow-2xl shadow-slate-900/20">
                                    <BookOpen className="w-10 h-10" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-tight mb-2">{selectedRequest.courseName}</h2>
                                    <div className="flex flex-wrap gap-2">
                                        <span className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${style.bg}`}>
                                            <StatusIcon className="w-3 h-3" />
                                            {style.label}
                                        </span>
                                        <span className="px-4 py-1.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-widest">
                                            UID: {selectedRequest.id}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] space-y-4">
                                    <div className="flex items-center gap-3 text-slate-400">
                                        <Building className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Target Institution</span>
                                    </div>
                                    <p className="text-lg font-black text-slate-900 uppercase tracking-tight leading-snug">
                                        {selectedRequest.universityName}
                                    </p>
                                </div>

                                <div className="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] space-y-4">
                                    <div className="flex items-center gap-3 text-slate-400">
                                        <Layout className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Deployment Unit</span>
                                    </div>
                                    <p className="text-lg font-black text-slate-900 uppercase tracking-tight leading-snug">
                                        {selectedRequest.type}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <History className="w-5 h-5 text-slate-400" />
                                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Governance Feedback</h3>
                                </div>
                                <div className="p-8 bg-white border border-slate-200 rounded-[3rem] shadow-inner shadow-slate-50">
                                    {selectedRequest.remarks ? (
                                        <p className="text-slate-600 font-medium italic leading-relaxed">
                                            "{selectedRequest.remarks}"
                                        </p>
                                    ) : (
                                        <div className="text-center py-6">
                                            <p className="text-slate-400 text-sm font-bold uppercase tracking-tight italic">Awaiting administrative feedback packet...</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-10 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Logging timestamp</p>
                                        <p className="text-xs font-black text-slate-900">
                                            {new Date(selectedRequest.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsDetailsOpen(false)}
                                    className="px-10 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-slate-900/20 hover:scale-105 active:scale-95 transition-all w-full md:w-auto"
                                >
                                    Dismiss Examination
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </Modal>
        </div>
    );
}
