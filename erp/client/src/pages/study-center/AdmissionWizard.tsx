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
    const [selectedProgram, setSelectedProgram] = useState<number | null>(null);
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
            const res = await api.get(`/fees/${id}`);
            setFeeSchemas(res.data);
            setStep(2);
        } catch (error) {
            toast.error('Failed to load fee structures for this program');
        }
    };

    const onFinalSubmit = async (data: any) => {
        try {
            setIsLoading(true);
            const payload = {
                ...data,
                programId: selectedProgram,
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
                <h1 className="text-3xl font-bold text-slate-900">Institutional Admission Wizard</h1>
                <p className="text-slate-500">Initialize a new student enrollment node within the ERP architecture.</p>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-center space-x-4 mb-12">
                <StepIndicator current={step} target={1} label="Program" icon={<GraduationCap className="w-4 h-4" />} />
                <div className="w-12 h-px bg-slate-200" />
                <StepIndicator current={step} target={2} label="Fee Schema" icon={<DollarSign className="w-4 h-4" />} />
                <div className="w-12 h-px bg-slate-200" />
                <StepIndicator current={step} target={3} label="Credentials" icon={<UserPlus className="w-4 h-4" />} />
            </div>

            {/* Step 1: Program Selection */}
            {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {programs.map(prog => (
                        <div 
                            key={prog.id} 
                            onClick={() => handleProgramSelect(prog.id)}
                            className="p-6 bg-white border border-slate-200 rounded-2xl hover:border-blue-500 hover:shadow-lg hover:shadow-blue-50 cursor-pointer transition-all group"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-slate-900 group-hover:text-blue-600">{prog.name}</h3>
                                    <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-widest">{prog.university?.name || 'Partner University'}</p>
                                    <span className="inline-block mt-3 px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full uppercase">{prog.type}</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500" />
                            </div>
                        </div>
                    ))}
                    {programs.length === 0 && <div className="col-span-2 text-center p-12 bg-slate-50 rounded-2xl text-slate-400 italic">No programs currently open for global admissions.</div>}
                </div>
            )}

            {/* Step 2: Fee Schema Selection */}
            {step === 2 && (
                <div className="space-y-4">
                    {feeSchemas.map(fee => (
                        <div 
                            key={fee.id}
                            onClick={() => { setSelectedFee(fee.id); setStep(3); }}
                            className="p-6 bg-white border border-slate-200 rounded-2xl hover:border-blue-500 cursor-pointer transition-all flex items-center justify-between"
                        >
                            <div>
                                <h3 className="font-bold text-slate-900">{fee.name}</h3>
                                <p className="text-sm text-slate-500 mt-1 uppercase tracking-tight font-mono">Structure: {fee.schema.type}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-slate-400 uppercase">Installments</p>
                                <p className="text-lg font-bold text-slate-900">{fee.schema.installments.length}</p>
                            </div>
                        </div>
                    ))}
                    <button onClick={() => setStep(1)} className="text-sm text-slate-500 hover:text-slate-900 font-bold px-4">Back to Programs</button>
                    {feeSchemas.length === 0 && <div className="text-center p-12 bg-red-50 text-red-600 rounded-2xl font-bold">No verified fee schemas located for this academic node. Please contact Finance.</div>}
                </div>
            )}

            {/* Step 3: Student Data */}
            {step === 3 && (
                <form onSubmit={handleSubmit(onFinalSubmit)} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-full">
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tighter">Full Student Identity</label>
                            <input 
                                {...register('name', { required: true })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Legal Name as per 10th Certificate"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tighter">10th Aggregate (%)</label>
                            <input 
                                type="number"
                                {...register('tenthMarks', { required: true })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-tighter">12th Aggregate (%)</label>
                            <input 
                                type="number"
                                {...register('twelfthMarks', { required: true })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3">
                        <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-blue-900 uppercase tracking-tight">Compliance Statement</p>
                            <p className="text-xs text-blue-700 leading-relaxed mt-1">
                                By submitting this manifold, the Center certifies that original documents have been physically verified and eligibility criteria matched with the institutional program parameters.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                        <button type="button" onClick={() => setStep(2)} className="text-slate-500 font-bold hover:text-slate-900 transition-colors">Return to Fees</button>
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 shadow-lg shadow-slate-200 flex items-center gap-2"
                        >
                            {isLoading ? "Synchronizing..." : <><Check className="w-4 h-4" /> Finalize Enrollment</>}
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
