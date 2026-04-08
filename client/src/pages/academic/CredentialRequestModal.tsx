import { useState } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { ShieldAlert, Send } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  centerId: number;
  centerName: string;
}

export default function CredentialRequestModal({ isOpen, onClose, centerId, centerName }: Props) {
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (remarks.length < 30) {
      toast.error('Forensic justification must be at least 30 characters');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/academic/credentials/request', { centerId, remarks });
      toast.success('Access request submitted to Finance for authorization');
      onClose();
    } catch (error) {
       toast.error('Failed to submit security request');
    } finally {
       setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="High-Security Credential Reveal Request">
       <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3 text-amber-700">
             <ShieldAlert className="w-5 h-5 shrink-0" />
             <div className="text-xs font-bold leading-relaxed">
                This action is forensically logged. Requests are authorized by Finance and will only provide access for a 30-minute window upon approval.
             </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Target Center</p>
             <p className="font-black text-slate-900 uppercase tracking-tight">{centerName}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Forensic Justification (Min 30 chars)</label>
                <textarea 
                  rows={4}
                  className="w-full bg-slate-50 border-transparent rounded-2xl px-4 py-4 text-sm focus:bg-white focus:ring-2 ring-blue-500 transition-all font-medium placeholder:italic"
                  placeholder="State the institutional reason for requirement..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
                <p className={`text-right text-[10px] font-black uppercase tracking-widest ${remarks.length >= 30 ? 'text-emerald-500' : 'text-slate-300'}`}>
                   {remarks.length} / 30
                </p>
             </div>

             <button 
               type="submit"
               disabled={submitting || remarks.length < 30}
               className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
             >
                <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                Submit to Finance
             </button>
          </form>
       </div>
    </Modal>
  );
}
