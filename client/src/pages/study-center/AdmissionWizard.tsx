import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Check, GraduationCap, DollarSign, UserPlus, Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
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

export default function AdmissionWizard({ onClose, onSuccess, initialData }: { 
    onClose?: () => void, 
    onSuccess?: () => void,
    initialData?: any 
}) {
    const [step, setStep] = useState(1);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [feeSchemas, setFeeSchemas] = useState<FeeSchema[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [selectedProgram, setSelectedProgram] = useState<number | null>(null);
    const [selectedSession, setSelectedSession] = useState<number | null>(null);
    const [selectedFee, setSelectedFee] = useState<number | string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [marksProof, setMarksProof] = useState<string | null>(null);
    const [paymentReceipt, setPaymentReceipt] = useState<string | null>(null);
    const [uploadingReceipt, setUploadingReceipt] = useState(false);
    const [marksProofName, setMarksProofName] = useState<string | null>(null);
    const [paymentReceiptName, setPaymentReceiptName] = useState<string | null>(null);

    const { register, handleSubmit, reset, watch, setError, formState: { errors, isValid }, trigger } = useForm({
        mode: "onChange"
    });

    useEffect(() => {
        const fetchAuthorizedPrograms = async () => {
            try {
                const res = await api.get('/portals/partner-center/programs');
                setPrograms(res.data.map((m: any) => m.program));
            } catch (error) {
                toast.error('Failed to load authorized admissions catalog');
            }
        };
        fetchAuthorizedPrograms();
    }, []);

    useEffect(() => {
        if (initialData) {
            setSelectedProgram(initialData.programId);
            setSelectedSession(initialData.sessionId);
            setSelectedFee(initialData.feeSchemaId);
            if (initialData.marks?.marksProof) {
                setMarksProof(initialData.marks.marksProof);
            }
            if (initialData.activationInvoice?.payment?.receiptUrl) {
                setPaymentReceipt(initialData.activationInvoice.payment.receiptUrl);
                const name = initialData.activationInvoice.payment.receiptUrl.split('/').pop();
                setPaymentReceiptName(name || 'Existing Receipt');
            }
            if (initialData.marks?.marksProof) {
                setMarksProof(initialData.marks.marksProof);
                const name = initialData.marks.marksProof.split('/').pop();
                setMarksProofName(name || 'Existing Proof');
            }
            // If editing, start at the data step if program/session are already set
            if (initialData.programId && initialData.sessionId && initialData.feeSchemaId) {
                setStep(4);
            }
            reset({
                name: initialData.name,
                lastExam: initialData.marks?.lastExam,
                lastExamScore: initialData.marks?.lastExamScore,
                customExamName: initialData.marks?.lastExam === 'Custom' ? initialData.marks?.lastExam : '',
                paymentMode: initialData.activationInvoice?.payment?.mode,
                transactionId: initialData.activationInvoice?.payment?.transactionId
            });
        }
    }, [initialData, reset]);

    const handleProgramSelect = async (id: number) => {
        if (!id) return;
        setSelectedProgram(id);
        try {
            const res = await api.get('/portals/partner-center/sessions', { params: { programId: id } });
            const activeSessions = res.data.filter((s: any) => s.isActive && s.approvalStatus === 'APPROVED' && s.programId === id);
            setSessions(activeSessions);
            setStep(2);
        } catch (error) {
            toast.error('Failed to load active batches for this program');
        }
    };

    const handleSessionSelect = async (sessionId: number) => {
        setSelectedSession(sessionId);
        try {
            const res = await api.get(`/fees/${selectedProgram}`);
            setFeeSchemas(res.data);
            setStep(3);
        } catch (error) {
            toast.error('Failed to fetch fee schemas');
        }
    };

    const selectedFeeSchema = feeSchemas.find(f => f.id === selectedFee || f.id.toString() === selectedFee?.toString());

    const handleFeeSelect = (feeId: string | number) => {
        setSelectedFee(feeId);
        // We don't auto-advance anymore, let user see the breakdown
    };

    const handleFinalStep = async () => {
        if (!selectedFee) {
            setError('root' as any, { type: 'manual', message: 'Select a payment plan to continue' });
            return;
        }
        setStep(4);
    };

    const handleDataStep = async () => {
        const result = await trigger(['name', 'email', 'lastExam', 'lastExamScore']);
        if (result) {
            if (!marksProof) {
                setError('root' as any, { type: 'manual', message: 'Credential proof (marksheet) is required for verification' });
                return;
            }
            setStep(5);
        } else {
            setError('root' as any, { type: 'manual', message: 'Resolve validation errors in the candidate profile' });
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
                    lastExam: data.lastExam === 'Custom' ? data.customExamName : data.lastExam,
                    lastExamScore: data.lastExamScore,
                    marksProof: marksProof
                },
                payment: {
                    mode: data.paymentMode,
                    transactionId: data.transactionId,
                    receiptUrl: paymentReceipt
                }
            };

            if (initialData?.id) {
                await api.put(`/portals/partner-center/admission/${initialData.id}`, payload);
                toast.success('Student record refined successfully');
            } else {
                const response = await api.post('/portals/partner-center/admission', payload);
                const { invoice } = response.data;
                
                toast.success(
                    <div className="flex flex-col text-xs">
                        <span className="font-bold">Admission Node Provisioned</span>
                        <span className="opacity-80">Invoice: {invoice.invoiceNo}</span>
                    </div>
                );
            }
            
            reset();
            if (onSuccess) onSuccess();
            if (onClose) onClose();
            else {
                setStep(1);
                setSelectedProgram(null);
                setSelectedSession(null);
                setSelectedFee(null);
            }
         } catch (error: any) {
            const status = error.response?.status;
            const msg = error.response?.data?.error || 'Admission logic breakdown';
            if (status === 409 && /name/i.test(msg)) {
              setError('name', { type: 'server', message: msg });
              setStep(1);
            } else if (/email/i.test(msg)) {
              setError('email', { type: 'server', message: msg });
              setStep(1);
            } else if (/transaction/i.test(msg)) {
              setError('transactionId', { type: 'server', message: msg });
            } else {
              setError('root' as any, { type: 'server', message: msg });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-2 space-y-6">
            {!onClose && (
                <PageHeader 
                    title="Institutional admission wizard"
                    description="Initiate student enrollment and provision academic nodes."
                    icon={UserPlus}
                />
            )}
            <form onSubmit={handleSubmit(onFinalSubmit)} className="space-y-6">
            {(errors as any).root && (
              <div className="p-3 rounded-xl border border-rose-200 bg-rose-50">
                <p className="text-xs font-bold text-rose-700">{(errors as any).root.message}</p>
              </div>
            )}
            <div className="flex items-center justify-between mb-8 px-2">
                <StepIndicator current={step} target={1} label="program" icon={<GraduationCap className="w-4 h-4" />} />
                <div className="flex-1 h-px bg-slate-200 mx-2" />
                <StepIndicator current={step} target={2} label="batch" icon={<Check className="w-4 h-4" />} />
                <div className="flex-1 h-px bg-slate-200 mx-2" />
                <StepIndicator current={step} target={3} label="fees" icon={<DollarSign className="w-4 h-4" />} />
                <div className="flex-1 h-px bg-slate-200 mx-2" />
                <StepIndicator current={step} target={4} label="data" icon={<UserPlus className="w-4 h-4" />} />
                <div className="flex-1 h-px bg-slate-200 mx-2" />
                <StepIndicator current={step} target={5} label="pay" icon={<DollarSign className="w-4 h-4" />} />
            </div>

            {/* Step 1: Program Selection */}
            {step === 1 && (
                <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 tracking-widest">Select academic program</label>
                        <select 
                            onChange={(e) => handleProgramSelect(Number(e.target.value))}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                            defaultValue=""
                        >
                            <option value="" disabled>Choose a sanctioned program...</option>
                            {programs.map(prog => (
                                <option key={prog.id} value={prog.id}>{prog.name} ({prog.type})</option>
                            ))}
                        </select>
                    </div>
                    {programs.length === 0 && <p className="text-center text-xs text-slate-400 ">No programs currently authorized for this center.</p>}
                </div>
            )}

            {/* Step 2: Session Selection */}
            {step === 2 && (
                <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 tracking-widest">Select active intake</label>
                        <select 
                            onChange={(e) => handleSessionSelect(Number(e.target.value))}
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                            defaultValue=""
                        >
                            <option value="" disabled>Choose an approved batch...</option>
                            {sessions.map(sess => (
                                <option key={sess.id} value={sess.id}>{sess.name} (Ends: {new Date(sess.endDate).toLocaleDateString()})</option>
                            ))}
                        </select>
                    </div>
                    <button onClick={() => setStep(1)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors">← Back to programs</button>
                    {sessions.length === 0 && <p className="text-center text-xs text-amber-600 font-bold bg-amber-50 p-4 rounded-xl">No active intakes located for this program.</p>}
                </div>
            )}

            {/* Step 3: Fee Schema Selection */}
            {step === 3 && (
                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 tracking-widest mb-3 ml-1">Select billing manifest</label>
                        <select 
                            value={selectedFee || ''}
                            onChange={(e) => handleFeeSelect(e.target.value)}
                            className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-900"
                        >
                            <option value="">Choose a payment plan...</option>
                            {feeSchemas.map(fee => (
                                <option key={fee.id} value={fee.id}>
                                    {fee.name} — {fee.schema?.installments?.length || 0} Installments
                                </option>
                            ))}
                        </select>
                        {feeSchemas.length === 0 && (
                            <p className="text-[10px] text-slate-400 text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 mt-4">
                                No specialized fee structures located for this academic node.
                            </p>
                        )}
                    </div>

                    {selectedFeeSchema && (
                        <div className="bg-slate-900 rounded-2xl p-6 text-white animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h4 className="text-[10px] font-black tracking-[0.2em] text-blue-400 mb-1">Fee breakdown</h4>
                                    <p className="text-xl font-black">{selectedFeeSchema.name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black tracking-widest text-slate-500 mb-1">Plan frequency</p>
                                    <p className="text-xs font-bold">{selectedFeeSchema.schema?.type}</p>
                                </div>
                            </div>
                            
                            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {selectedFeeSchema.schema?.installments?.map((inst: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center py-2 border-b border-white/10 last:border-0">
                                        <span className="text-[10px] font-bold text-slate-400 tracking-tight">{inst.label}</span>
                                        <span className="text-xs font-black">₹{parseFloat(inst.amount).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 pt-6 border-t border-white/20 flex justify-between items-center">
                                <span className="text-xs font-black tracking-widest">Aggregate liability</span>
                                <span className="text-2xl font-black text-blue-400">
                                    ₹{selectedFeeSchema.schema?.installments?.reduce((sum: number, i: any) => sum + parseFloat(i.amount), 0).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        <button 
                            type="button"
                            onClick={handleFinalStep}
                            disabled={!selectedFee}
                            className="w-full bg-slate-900 text-white py-4 rounded-xl font-black tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-xs"
                        >
                            Continue to candidate info <Plus className="w-4 h-4 ml-1" />
                        </button>
                        <button type="button" onClick={() => setStep(2)} className="text-[10px] font-black text-slate-400 tracking-widest hover:text-slate-600 transition-colors text-center w-full">Back to batches</button>
                    </div>
                </div>
            )}

            {/* Step 4: Student Data */}
            <div className={`space-y-6 ${step === 4 ? 'block' : 'hidden'}`}>
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 tracking-widest mb-2">Student legal name</label>
                            <input 
                                {...register('name', { 
                                    required: "Full name is required",
                                    minLength: { value: 3, message: "Name must be at least 3 characters" },
                                    maxLength: { value: 25, message: "Name cannot exceed 25 characters" }
                                })}
                                className={`w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none transition-all font-bold text-slate-900 ${errors.name ? 'border-rose-400 bg-rose-50/50 focus:ring-rose-200' : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'}`}
                                placeholder="As per 10th certificate"
                            />
                            {errors.name && (
                                <p className="text-[9px] font-black text-rose-600 tracking-tighter mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                    {errors.name.message as string}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 tracking-widest mb-2">Institutional email address</label>
                            <input 
                                type="email"
                                {...register('email', { 
                                    required: "Institutional email is required",
                                    pattern: { value: /^\S+@\S+\.\S+$/, message: "Invalid institutional email format" },
                                    maxLength: { value: 50, message: "Email must be under 50 characters" }
                                })}
                                className={`w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none transition-all font-bold text-slate-900 ${errors.email ? 'border-rose-400 bg-rose-50/50 focus:ring-rose-200' : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'}`}
                                placeholder="student@example.com"
                            />
                            {errors.email && (
                                <p className="text-[9px] font-black text-rose-600 tracking-tighter mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                    {errors.email.message as string}
                                </p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className={watch('lastExam') === 'Custom' ? 'col-span-2' : ''}>
                                <label className="block text-[10px] font-black text-slate-400 tracking-widest mb-2">Last qualified exam</label>
                                <select 
                                    {...register('lastExam', { required: "Academic qualification is required" })}
                                    className={`w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none transition-all font-bold text-slate-900 ${errors.lastExam ? 'border-rose-400 bg-rose-50/50 focus:ring-rose-200' : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'}`}
                                >
                                    <option value="">-- Choose Qualification --</option>
                                    <option value="10th">10th Standard</option>
                                    <option value="12th">12th Standard / HSC</option>
                                    <option value="Diploma">Diploma</option>
                                    <option value="BCA">BCA (Bachelors)</option>
                                    <option value="BBA">BBA (Bachelors)</option>
                                    <option value="B.Com">B.Com (Bachelors)</option>
                                    <option value="B.Sc">B.Sc (Bachelors)</option>
                                    <option value="B.A">B.A (Bachelors)</option>
                                    <option value="B.Tech">B.Tech (Engineering)</option>
                                    <option value="MCA">MCA (Masters)</option>
                                    <option value="MBA">MBA (Masters)</option>
                                    <option value="M.Com">M.Com (Masters)</option>
                                    <option value="M.Sc">M.Sc (Masters)</option>
                                    <option value="Other">Other / Professional Certification</option>
                                    <option value="Custom">-- Custom Entry --</option>
                                </select>
                            </div>

                            {watch('lastExam') === 'Custom' && (
                                <div className="col-span-2 animate-in slide-in-from-top-2 duration-300">
                                    <label className="block text-[10px] font-black text-blue-500 tracking-widest mb-2">Specify custom qualification</label>
                                    <input 
                                        {...register('customExamName', { required: { value: watch('lastExam') === 'Custom', message: "Enter qualification name" } })}
                                        className={`w-full px-4 py-3 bg-blue-50 border rounded-xl outline-none transition-all font-bold text-slate-900 shadow-sm shadow-blue-100/50 ${errors.customExamName ? 'border-rose-400' : 'border-blue-100 focus:ring-blue-500/10 focus:border-blue-500'}`}
                                        placeholder="Enter the full name of the qualification..."
                                    />
                                    {errors.customExamName && <p className="text-[9px] font-black text-rose-600 uppercase mt-1 ml-1">{errors.customExamName.message as string}</p>}
                                </div>
                            )}

                            <div className={watch('lastExam') === 'Custom' ? 'col-span-2' : ''}>
                                <label className="block text-[10px] font-black text-slate-400 tracking-widest mb-2">Last qualified exam %</label>
                                <input 
                                    type="number"
                                    step="0.01"
                                    {...register('lastExamScore', { required: "Last aggregate score is required" })}
                                    className={`w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none transition-all font-bold text-slate-900 ${errors.lastExamScore ? 'border-rose-400 bg-rose-50/50 focus:ring-rose-200' : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'}`}
                                    placeholder="0.00"
                                />
                                {errors.lastExamScore && (
                                    <p className="text-[9px] font-black text-rose-600 tracking-tighter mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                        {errors.lastExamScore.message as string}
                                    </p>
                                )}
                            </div>

                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 tracking-widest mb-2">Exam certificate / marksheet</label>
                                <div className="relative">
                                    <input 
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            
                                            try {
                                                setUploading(true);
                                                setMarksProofName(file.name);
                                                const formData = new FormData();
                                                formData.append('document', file);
                                                const res = await api.post('/upload', formData, {
                                                    headers: { 'Content-Type': 'multipart/form-data' }
                                                });
                                                setMarksProof(res.data.filePath);
                                                toast.success('Certificate uploaded successfully');
                                            } catch (error) {
                                                setMarksProofName(null);
                                                toast.error('Failed to upload certificate');
                                            } finally {
                                                setUploading(false);
                                            }
                                        }}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-900 text-xs file:hidden cursor-pointer"
                                    />
                                    {marksProofName && !uploading && (
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <span className="text-[10px] font-black text-slate-700 tracking-tight truncate max-w-[200px] block">
                                                {marksProofName}
                                            </span>
                                        </div>
                                    )}
                                    {uploading && (
                                        <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
                                            <span className="text-[10px] font-black text-blue-600 animate-pulse tracking-widest">Uploading proof...</span>
                                        </div>
                                    )}
                                    {marksProof && !uploading && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-emerald-500 text-white p-1 rounded-full">
                                            <Check className="w-3 h-3" />
                                        </div>
                                    )}
                                </div>
                                <p className="text-[8px] text-slate-400 mt-2 font-bold tracking-tighter">PDF, JPG, PNG up to 5MB are accepted</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button 
                            type="button" 
                            onClick={handleDataStep}
                            className={`w-full py-4 rounded-xl font-black tracking-widest transition-all flex items-center justify-center gap-2 text-xs ${marksProof && watch('name') && watch('email') ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                        >
                            Continue to payment <DollarSign className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => setStep(3)} className="text-[10px] font-black text-slate-400 tracking-widest hover:text-slate-600 transition-colors text-center w-full">Back to fees</button>
                    </div>
            </div>

            {/* Step 5: Payment */}
            <div className={`space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 ${step === 5 ? 'block' : 'hidden'}`}>
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <h4 className="text-[10px] font-black text-slate-400 tracking-widest mb-2">Initial liability</h4>
                            <p className="text-2xl font-black text-slate-900">
                                ₹{parseFloat(selectedFeeSchema?.schema?.installments?.[0]?.amount || '0').toLocaleString()}
                            </p>
                            <p className="text-[10px] font-bold text-slate-500 mt-1">First installment (+ institutional GST 18%)</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 tracking-widest mb-2">Collection mode</label>
                                <select 
                                    {...register('paymentMode', { required: "Select a payment collection mode" })}
                                    className={`w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none transition-all font-bold text-slate-900 ${errors.paymentMode ? 'border-rose-400 bg-rose-50/50 focus:ring-rose-200' : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'}`}
                                >
                                    <option value="">-- Select Mode --</option>
                                    <option value="Cash">Cash at Center</option>
                                    <option value="UPI">UPI / Digital Wallet</option>
                                    <option value="Bank Transfer">IMPS / NEFT / RTGS</option>
                                    <option value="Cheque">Demand Draft / Cheque</option>
                                </select>
                            </div>

                            {watch('paymentMode') && watch('paymentMode') !== 'Cash' && (
                                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 tracking-widest mb-2">Transaction / UTR number</label>
                                        <input 
                                            {...register('transactionId', { 
                                                required: { value: watch('paymentMode') !== 'Cash', message: "Transaction ID is required for digital payments" },
                                                minLength: { value: 3, message: "UTR must be at least 3 characters" },
                                                maxLength: { value: 20, message: "UTR cannot exceed 20 characters" }
                                            })}
                                            className={`w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none transition-all font-bold text-slate-900 ${errors.transactionId ? 'border-rose-400 bg-rose-50/50 focus:ring-rose-200' : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'}`}
                                            placeholder="Enter reference ID..."
                                        />
                                        {errors.transactionId && (
                                            <p className="text-[9px] font-black text-rose-600 tracking-tighter mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                                {errors.transactionId.message as string}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 tracking-widest mb-2">
                                     Payment receipt / deposit proof (image/pdf)
                                </label>
                                <div className="relative">
                                    <input 
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            try {
                                                setUploadingReceipt(true);
                                                setPaymentReceiptName(file.name);
                                                const formData = new FormData();
                                                formData.append('document', file);
                                                const res = await api.post('/upload', formData, {
                                                    headers: { 'Content-Type': 'multipart/form-data' }
                                                });
                                                setPaymentReceipt(res.data.filePath);
                                                toast.success('Receipt uploaded successfully');
                                            } catch (error) {
                                                setPaymentReceiptName(null);
                                                toast.error('Receipt upload failed');
                                            } finally {
                                                setUploadingReceipt(false);
                                            }
                                        }}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-900 text-xs file:hidden cursor-pointer"
                                    />
                                    {paymentReceiptName && !uploadingReceipt && (
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <span className="text-[10px] font-black text-slate-700 tracking-tight truncate max-w-[240px] block">
                                                {paymentReceiptName}
                                            </span>
                                        </div>
                                    )}
                                    {uploadingReceipt && (
                                        <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
                                            <span className="text-[10px] font-black text-blue-600 animate-pulse tracking-widest">Processing...</span>
                                        </div>
                                    )}
                                    {paymentReceipt && !uploadingReceipt && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-emerald-500 text-white p-1 rounded-full">
                                            <Check className="w-3 h-3" />
                                        </div>
                                    )}
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-3">
                                    <p className="text-[8px] text-slate-400 font-bold tracking-tighter">
                                        Upload the collected receipt, challan, cash slip, or transfer proof for Finance review.
                                    </p>
                                    {paymentReceipt && !uploadingReceipt && (
                                        <a
                                            href={paymentReceipt.startsWith('http') ? paymentReceipt : `${(import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace('/api', '')}${paymentReceipt}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[9px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 whitespace-nowrap"
                                        >
                                            View proof
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button 
                            type="submit" 
                            disabled={isLoading || uploadingReceipt || !isValid || !paymentReceipt}
                            className={`w-full py-4 rounded-xl font-black tracking-widest transition-all flex items-center justify-center gap-2 text-xs ${isValid && paymentReceipt ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                        >
                            {isLoading ? "Provisioning..." : <><Check className="w-4 h-4" /> Finalize enrollment & billing</>}
                        </button>
                        <button type="button" onClick={() => setStep(4)} className="text-[10px] font-black text-slate-400 tracking-widest hover:text-slate-600 transition-colors text-center w-full">Back to candidate info</button>
                    </div>
            </div>
        </form>
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
