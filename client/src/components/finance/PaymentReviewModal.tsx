import { useState, useEffect } from 'react';
import { Modal } from '../shared/Modal';
import { ShieldCheck, User, CreditCard, FileText, ExternalLink } from 'lucide-react';

interface PaymentReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (remarks: string) => void;
  payment: any; // Using any for now to simplify prototype integration
}

export function PaymentReviewModal({ isOpen, onClose, onConfirm, payment }: PaymentReviewModalProps) {
  const [remarks, setRemarks] = useState('');
  
  // Reset remarks on open
  useEffect(() => {
    if (isOpen) setRemarks('');
  }, [isOpen]);

  if (!payment) return null;

  const student = payment.student || {};
  const program = student.program || {};
  const center = student.center || {};

  const handleConfirm = () => {
    if (remarks.length < 12) return;
    onConfirm(remarks);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Institutional Payment Audit" maxWidth="2xl">
      <div className="space-y-6">
        {/* Forensic Audit Protocol Header */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-700 flex gap-4 text-white shadow-xl">
          <ShieldCheck className="w-8 h-8 text-blue-400 shrink-0" />
          <div>
            <h3 className="font-black uppercase tracking-tighter text-sm">Forensic Audit Protocol</h3>
            <p className="text-[10px] opacity-60 mt-1 leading-relaxed uppercase tracking-tight font-medium">
              A comprehensive verification of student identity and financial evidence is required. 
              Submitting your decision permanently locks this transaction in the ledger.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Student Identity Card */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <User className="w-4 h-4 text-blue-600" />
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Candidate Identity</h4>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Full Name</p>
                <p className="text-sm font-bold text-slate-900">{student.name || 'Anonymous candidate'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">Student UID</p>
                  <p className="text-xs font-mono font-bold text-slate-700">{student.uid || `ID-${student.id}`}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">Enroll Status</p>
                  <p className="text-[10px] inline-block font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded uppercase">{student.enrollStatus || 'Pending'}</p>
                </div>
              </div>

              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Academic Program</p>
                <p className="text-xs font-bold text-slate-700">{program.name || 'General Batch'}</p>
              </div>

              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Parent Study Center</p>
                <p className="text-xs font-bold text-slate-700">{center.name || 'Corporate Hub'}</p>
              </div>
            </div>
          </div>

          {/* Payment Detail Card */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Financial Evidence</h4>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Transfer Amount</p>
                <p className="text-xl font-black text-slate-900">₹{parseFloat(payment.amount).toLocaleString('en-IN')}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">Payment Mode</p>
                  <p className="text-xs font-bold text-slate-700 uppercase">{payment.mode}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase">Date Logged</p>
                  <p className="text-xs font-bold text-slate-700">{new Date(payment.date).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Transaction ID / Ref</p>
                <p className="text-xs font-mono font-bold text-slate-700">{payment.transactionId || 'NOT_PROVIDED'}</p>
              </div>

              {payment.receiptUrl ? (
                <a 
                  href={`${(import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace('/api', '')}${payment.receiptUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                  <FileText className="w-3 h-3" />
                  View Payment Slip
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <div className="py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-center border border-rose-100">
                  No Payment Slip Uploaded
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mandatory Justification */}
        <div className="space-y-3">
            <div className="flex justify-between items-end px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Audit Rationale (Mandatory)</label>
                <span className={`text-[10px] font-black ${remarks.length >= 12 ? 'text-emerald-500' : 'text-rose-400'}`}>
                    {remarks.length} / 12 characters required
                </span>
            </div>
            <textarea 
                required
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full h-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 text-sm placeholder:text-slate-300 font-medium transition-all"
                placeholder="Declare your verification decision rationale..."
            />
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button 
              onClick={onClose} 
              className="px-6 py-2.5 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors"
            >
              Cancel Audit
            </button>
            <button 
                disabled={remarks.length < 12}
                onClick={handleConfirm}
                className={`px-10 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all shadow-xl ${
                    remarks.length >= 12 
                    ? 'bg-emerald-600 text-white shadow-emerald-200 hover:-translate-y-0.5 hover:bg-emerald-500' 
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
            >
                Confirm & Issue Invoice
            </button>
        </div>
      </div>
    </Modal>
  );
}
