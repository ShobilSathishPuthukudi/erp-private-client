import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Check, GraduationCap, DollarSign, UserPlus, Plus } from 'lucide-react';
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

    const { register, handleSubmit, reset, watch } = useForm();

    useEffect(() => {
        const fetchAuthorizedPrograms = async () => {
            try {
                const res = await api.get('/portals/study-center/programs');
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
            const res = await api.get('/portals/study-center/sessions', { params: { programId: id } });
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

    const handleFinalStep = () => {
        if (!selectedFee) {
            toast.error('Select a payment plan to continue');
            return;
        }
        setStep(4);
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
                await api.put(`/portals/study-center/admission/${initialData.id}`, payload);
                toast.success('Student record refined successfully');
            } else {
                const response = await api.post('/portals/study-center/admission', payload);
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
            toast.error(error.response?.data?.error || 'Admission logic breakdown');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onFinalSubmit)} className="space-y-6">
            <div className="flex items-center justify-between mb-8 px-2">
                <StepIndicator current={step} target={1} label="Program" icon={<GraduationCap className="w-4 h-4" />} />
                <div className="flex-1 h-px bg-slate-200 mx-2" />
                <StepIndicator current={step} target={2} label="Batch" icon={<Check className="w-4 h-4" />} />
                <div className="flex-1 h-px bg-slate-200 mx-2" />
                <StepIndicator current={step} target={3} label="Fees" icon={<DollarSign className="w-4 h-4" />} />
                <div className="flex-1 h-px bg-slate-200 mx-2" />
                <StepIndicator current={step} target={4} label="Data" icon={<UserPlus className="w-4 h-4" />} />
                <div className="flex-1 h-px bg-slate-200 mx-2" />
                <StepIndicator current={step} target={5} label="Pay" icon={<DollarSign className="w-4 h-4" />} />
            </div>

            {/* Step 1: Program Selection */}
            {step === 1 && (
                <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Academic Program</label>
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
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Active Intake</label>
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
                    <button onClick={() => setStep(1)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors">← Back to Programs</button>
                    {sessions.length === 0 && <p className="text-center text-xs text-amber-600 font-bold bg-amber-50 p-4 rounded-xl">No active intakes located for this program.</p>}
                </div>
            )}

            {/* Step 3: Fee Schema Selection */}
            {step === 3 && (
                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Select Billing Manifest</label>
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
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-1">Fee Breakdown</h4>
                                    <p className="text-xl font-black">{selectedFeeSchema.name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Plan Frequency</p>
                                    <p className="text-xs font-bold uppercase">{selectedFeeSchema.schema?.type}</p>
                                </div>
                            </div>
                            
                            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {selectedFeeSchema.schema?.installments?.map((inst: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center py-2 border-b border-white/10 last:border-0">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{inst.label}</span>
                                        <span className="text-xs font-black">₹{parseFloat(inst.amount).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 pt-6 border-t border-white/20 flex justify-between items-center">
                                <span className="text-xs font-black uppercase tracking-widest">Aggregate Liability</span>
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
                            className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-xs"
                        >
                            Continue to Candidate Info <Plus className="w-4 h-4 ml-1" />
                        </button>
                        <button type="button" onClick={() => setStep(2)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors text-center w-full">Back to Batches</button>
                    </div>
                </div>
            )}

            {/* Step 4: Student Data */}
            <div className={`space-y-6 ${step === 4 ? 'block' : 'hidden'}`}>
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Student Legal Name</label>
                            <input 
                                {...register('name', { required: true })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-900"
                                placeholder="As per 10th certificate"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Institutional Email Address</label>
                            <input 
                                type="email"
                                {...register('email', { required: true })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-900"
                                placeholder="student@example.com"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className={watch('lastExam') === 'Custom' ? 'col-span-2' : ''}>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Last Qualified Exam</label>
                                <select 
                                    {...register('lastExam', { required: true })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-900"
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
                                    <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Specify Custom Qualification</label>
                                    <input 
                                        {...register('customExamName', { required: watch('lastExam') === 'Custom' })}
                                        className="w-full px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-900 shadow-sm shadow-blue-100/50"
                                        placeholder="Enter the full name of the qualification..."
                                    />
                                </div>
                            )}

                            <div className={watch('lastExam') === 'Custom' ? 'col-span-2' : ''}>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Last Qualified Exam %</label>
                                <input 
                                    type="number"
                                    step="0.01"
                                    {...register('lastExamScore', { required: true })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-900"
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Exam Certificate / Marksheet</label>
                                <div className="relative">
                                    <input 
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            
                                            try {
                                                setUploading(true);
                                                const formData = new FormData();
                                                formData.append('document', file);
                                                const res = await api.post('/upload', formData, {
                                                    headers: { 'Content-Type': 'multipart/form-data' }
                                                });
                                                setMarksProof(res.data.filePath);
                                                toast.success('Certificate uploaded successfully');
                                            } catch (error) {
                                                toast.error('Failed to upload certificate');
                                            } finally {
                                                setUploading(false);
                                            }
                                        }}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-900 text-xs file:hidden cursor-pointer"
                                    />
                                    {uploading && (
                                        <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
                                            <span className="text-[10px] font-black text-blue-600 animate-pulse uppercase tracking-widest">Uploading Proof...</span>
                                        </div>
                                    )}
                                    {marksProof && !uploading && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-emerald-500 text-white p-1 rounded-full">
                                            <Check className="w-3 h-3" />
                                        </div>
                                    )}
                                </div>
                                <p className="text-[8px] text-slate-400 mt-2 font-bold uppercase tracking-tighter">PDF, JPG, PNG up to 5MB are accepted</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button 
                            type="button" 
                            onClick={() => setStep(5)}
                            className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 text-xs"
                        >
                            Continue to Payment <DollarSign className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => setStep(3)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors text-center w-full">Back to Fees</button>
                    </div>
            </div>

            {/* Step 5: Payment */}
            <div className={`space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 ${step === 5 ? 'block' : 'hidden'}`}>
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Initial Liability</h4>
                            <p className="text-2xl font-black text-slate-900">
                                ₹{parseFloat(selectedFeeSchema?.schema?.installments?.[0]?.amount || '0').toLocaleString()}
                            </p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">First Installment (+ Institutional GST 18%)</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Collection Mode</label>
                                <select 
                                    {...register('paymentMode', { required: true })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-900"
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
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Transaction / UTR Number</label>
                                        <input 
                                            {...register('transactionId', { required: true })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-900"
                                            placeholder="Enter reference ID..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment Receipt (Image/PDF)</label>
                                        <div className="relative">
                                            <input 
                                                type="file"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    try {
                                                        setUploadingReceipt(true);
                                                        const formData = new FormData();
                                                        formData.append('document', file);
                                                        const res = await api.post('/upload', formData, {
                                                            headers: { 'Content-Type': 'multipart/form-data' }
                                                        });
                                                        setPaymentReceipt(res.data.filePath);
                                                        toast.success('Receipt virtualized');
                                                    } catch (error) {
                                                        toast.error('Digitization failed');
                                                    } finally {
                                                        setUploadingReceipt(false);
                                                    }
                                                }}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-900 text-xs file:hidden cursor-pointer"
                                            />
                                            {uploadingReceipt && (
                                                <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
                                                    <span className="text-[10px] font-black text-blue-600 animate-pulse uppercase tracking-widest">Processing...</span>
                                                </div>
                                            )}
                                            {paymentReceipt && !uploadingReceipt && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-emerald-500 text-white p-1 rounded-full">
                                                    <Check className="w-3 h-3" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button 
                            type="submit" 
                            disabled={isLoading || uploadingReceipt}
                            className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-xs"
                        >
                            {isLoading ? "Provisioning..." : <><Check className="w-4 h-4" /> Finalize Enrollment & Billing</>}
                        </button>
                        <button type="button" onClick={() => setStep(4)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors text-center w-full">Back to Candidate Info</button>
                    </div>
            </div>
        </form>
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
