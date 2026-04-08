import { useState } from 'react';
import { Modal } from './Modal';
import { ShieldCheck } from 'lucide-react';

interface RemarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (remarks: string) => void;
  title: string;
  actionLabel?: string;
}

export function RemarkModal({ isOpen, onClose, onConfirm, title, actionLabel = 'Submit Decision' }: RemarkModalProps) {
  const [remarks, setRemarks] = useState('');

  const handleConfirm = () => {
    if (remarks.length < 12) return;
    onConfirm(remarks);
    setRemarks('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-700 flex gap-4 text-white">
          <ShieldCheck className="w-6 h-6 text-blue-400" />
          <div>
            <h3 className="font-black uppercase tracking-tighter">Forensic Audit Protocol</h3>
            <p className="text-[10px] opacity-70 mt-1 leading-relaxed uppercase tracking-tight">
              A justification of at least 50 characters is mandatory to modify the immutable ledger. 
              This entry will be permanently linked to your Admin identity.
            </p>
          </div>
        </div>

        <div className="space-y-2">
            <div className="flex justify-between items-end">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mandatory Justification</label>
                <span className={`text-[10px] font-black ${remarks.length >= 12 ? 'text-green-500' : 'text-red-400'}`}>
                    {remarks.length} / 12 Chars
                </span>
            </div>
            <textarea 
                required
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-slate-900 text-sm placeholder:text-slate-300 font-medium transition-all"
                placeholder="Declare the rationale for this modification in detail..."
            />
        </div>

        <div className="flex justify-end gap-3 uppercase">
            <button onClick={onClose} className="px-6 py-2 text-slate-400 font-black text-[10px] hover:bg-slate-50 rounded-xl">Cancel Action</button>
            <button 
                disabled={remarks.length < 12}
                onClick={handleConfirm}
                className={`px-10 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${
                    remarks.length >= 12 
                    ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 hover:-translate-y-0.5' 
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
            >
                {actionLabel}
            </button>
        </div>
      </div>
    </Modal>
  );
}
