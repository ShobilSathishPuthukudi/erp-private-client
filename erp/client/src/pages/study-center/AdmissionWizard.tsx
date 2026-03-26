import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Check, ChevronRight, GraduationCap, DollarSign, UserPlus, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

interface Program {
    id: number;
    name: string;
    university?: { name: string };
    type: string;
}

interface FeeSchema {
    id: number;
    name: string;
    schema: any;
}

export default function AdmissionWizard() {
    const [step, setStep] = useState(1);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [feeSchemas, setFeeSchemas] = useState<FeeSchema[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [selectedProgram, setSelectedProgram] = useState<number | null>(null);
    const [selectedSession, setSelectedSession] = useState<number | null>(null);
    const [selectedFee, setSelectedFee] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const { register, handleSubmit, reset } = useForm();

    useEffect(() => {
        const fetchOpenPrograms = async () => {
            try {
                const res = await api.get('/academic/programs');
                setPrograms(res.data.filter((p: any) => p.status === 'open'));
            } catch (error) {
                toast.error('Failed to load admissions catalog');
            }
        };
        fetchOpenPrograms();
    }, []);

    const handleProgramSelect = async (id: number) => {
        setSelectedProgram(id);
        try {
            const res = await api.get('/academic/sessions', { params: { programId: id } });
            // Only show APPROVED and ACTIVE sessions for the selected program
            const activeSessions = res.data.filter((s: any) => s.isActive && s.approvalStatus === 'APPROVED' && s.programId === id);
            setSessions(activeSessions);
            setStep(2); // Move to Session Selection
        } catch (error) {
            toast.error('Failed to load active batches for this program');
        }
    };

    const handleSessionSelect = async (id: number) => {
        setSelectedSession(id);
        try {
            const res = await api.get(`/fees/${selectedProgram}`);
            setFeeSchemas(res.data);
            setStep(3); // Move to Fee Schema
        } catch (error) {
            toast.error('Failed to load fee structures');
        }
    };

    const onFinalSubmit = async (data: any) => {
        try {
            setIsLoading(true);
            const payload = {
                ...data,
                programId: selectedProgram,
                sessionId: selectedSession,
                feeSchemaId: selectedFee,
                marks: {
                    tenth: data.tenthMarks,
                    twelfth: data.twelfthMarks
                }
            };
            await api.post('/portals/study-center/admission', payload);
            toast.success('Institutional admission protocol initiated. Awaiting eligibility check.');
            reset();
            setStep(1);
            setSelectedProgram(null);
            setSelectedSession(null);
            setSelectedFee(null);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Admission logic breakdown');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-slate-900 leading-tight">Institutional Admission Wizard</h1>
                <p className="text-slate-500 font-medium">Initialize a new student enrollment node within the sanctioned ERP architecture.</p>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-center space-x-4 mb-12">
                <StepIndicator current={step} target={1} label="Program" icon={<GraduationCap className="w-4 h-4" />} />
                <div className="w-8 h-px bg-slate-200" />
                <StepIndicator current={step} target={2} label="Batch" icon={<Check className="w-4 h-4" />} />
                <div className="w-8 h-px bg-slate-200" />
                <StepIndicator current={step} target={3} label="Fee Schema" icon={<DollarSign className="w-4 h-4" />} />
                <div className="w-8 h-px bg-slate-200" />
                <StepIndicator current={step} target={4} label="Credentials" icon={<UserPlus className="w-4 h-4" />} />
            </div>

            {/* Step 1: Program Selection */}
            {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {programs.map(prog => (
                        <div 
                            key={prog.id} 
                            onClick={() => handleProgramSelect(prog.id)}
                            className="p-6 bg-white border border-slate-200 rounded-2xl hover:border-blue-500 hover:shadow-xl hover:shadow-blue-50/50 cursor-pointer transition-all group"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">{prog.name}</h3>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-widest">{prog.university?.name || 'Partner University'}</p>
                                    <span className="inline-block mt-3 px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-black rounded-md uppercase tracking-tighter">{prog.type} Admissions</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                            </div>
                        </div>
                    ))}
                    {programs.length === 0 && <div className="col-span-2 text-center p-12 bg-slate-50 rounded-2xl text-slate-400 italic font-medium">No programs currently open for global admissions.</div>}
                </div>
            )}

            {/* Step 2: Session Selection */}
            {step === 2 && (
                <div className="space-y-4">
                    <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Select Approved Admission Intake</h2>
                    <div className="grid grid-cols-1 gap-4">
                        {sessions.map(sess => (
                            <div 
                                key={sess.id}
                                onClick={() => handleSessionSelect(sess.id)}
                                className="p-6 bg-white border border-slate-200 rounded-2xl hover:border-blue-500 hover:shadow-lg cursor-pointer transition-all flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        {sess.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">{sess.name}</h3>
                                        <p className="text-xs text-slate-500 font-medium">Ends: {new Date(sess.endDate).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded">Active Batch</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => setStep(1)} className="text-sm text-slate-400 hover:text-slate-900 font-black uppercase tracking-widest px-4 py-2 mt-4 transition-colors">Back to Programs</button>
                    {sessions.length === 0 && <div className="text-center p-12 bg-amber-50 text-amber-700 rounded-2xl font-bold border border-amber-100">No active admission intakes located for this program. Please contact the Sub-department.</div>}
                </div>
            )}

            {/* Step 3: Fee Schema Selection */}
            {step === 3 && (
                <div className="space-y-4">
                    <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Select Authorized Billing Manifest</h2>
                    {feeSchemas.map(fee => (
                        <div 
                            key={fee.id}
                            onClick={() => { setSelectedFee(fee.id); setStep(4); }}
                            className="p-6 bg-white border border-slate-200 rounded-2xl hover:border-blue-500 hover:shadow-lg cursor-pointer transition-all flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                    $
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">{fee.name}</h3>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-tighter">Structure: {fee.schema.type}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Installments</p>
                                <p className="text-xl font-black text-slate-900">{fee.schema.installments.length}</p>
                            </div>
                        </div>
                    ))}
                    <button onClick={() => setStep(2)} className="text-sm text-slate-400 hover:text-slate-900 font-black uppercase tracking-widest px-4 py-2 mt-4 transition-colors">Back to Batches</button>
                    {feeSchemas.length === 0 && <div className="text-center p-12 bg-red-50 text-red-600 rounded-2xl font-bold border border-red-100">No verified fee schemas located for this academic node. Please contact Finance.</div>}
                </div>
            )}

            {/* Step 4: Student Data */}
            {step === 4 && (
                <form onSubmit={handleSubmit(onFinalSubmit)} className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full translate-x-12 -translate-y-12" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        <div className="col-span-full">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Full Student Identity</label>
                            <input 
                                {...register('name', { required: true })}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold text-slate-900"
                                placeholder="Legal Name as per 10th Certificate"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">10th Aggregate (%)</label>
                            <input 
                                type="number"
                                {...register('tenthMarks', { required: true })}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold text-slate-900"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">12th Aggregate (%)</label>
                            <input 
                                type="number"
                                {...register('twelfthMarks', { required: true })}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold text-slate-900"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-black text-blue-900 uppercase tracking-widest">Compliance Statement</p>
                            <p className="text-xs text-blue-700 leading-relaxed font-medium mt-1">
                                By submitting this manifold, the Center certifies that original documents have been physically verified and eligibility criteria matched with the institutional program parameters.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-8 border-t border-slate-100">
                        <button type="button" onClick={() => setStep(3)} className="text-slate-400 font-extrabold uppercase tracking-widest text-xs hover:text-slate-900 transition-colors">Return to Fees</button>
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 shadow-2xl shadow-slate-900/20 flex items-center gap-3 transition-all active:scale-95 text-xs"
                        >
                            {isLoading ? "Synchronizing..." : <><Check className="w-5 h-5" /> Finalize Enrollment</>}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

function StepIndicator({ current, target, label, icon }: { current: number, target: number, label: string, icon: any }) {
    const active = current >= target;
    const isNow = current === target;

    return (
        <div className={`flex flex-col items-center space-y-2 ${active ? 'opacity-100' : 'opacity-40'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all shadow-sm ${
                isNow ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-blue-200' : 
                active ? 'bg-white border-green-500 text-green-500' : 'bg-white border-slate-200 text-slate-400'
            }`}>
                {active && current > target ? <Check className="w-5 h-5" /> : icon}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${isNow ? 'text-blue-600' : active ? 'text-green-600' : 'text-slate-400'}`}>
                {label}
            </span>
        </div>
    );
}
