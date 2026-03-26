import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Plus, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';

interface Holiday {
  id: number;
  name: string;
  date: string;
  description: string;
}

export default function Holidays() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', date: '', description: '' });

  const fetchHolidays = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/holidays');
      setHolidays(res.data);
    } catch (error) {
      toast.error('Failed to sync holiday registry');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/holidays', formData);
      toast.success('Institutional holiday certified');
      setIsModalOpen(false);
      setFormData({ name: '', date: '', description: '' });
      fetchHolidays();
    } catch (error) {
      toast.error('Holiday certification failure');
    }
  };

  const deleteHoliday = async (id: number) => {
    try {
      await api.delete(`/holidays/${id}`);
      toast.success('Holiday revoked');
      fetchHolidays();
    } catch (error) {
      toast.error('Revocation failure');
    }
  };

  const columns: ColumnDef<Holiday>[] = [
    { accessorKey: 'date', header: 'Timestamp', cell: ({ row }) => <span className="font-mono font-black text-slate-500">{new Date(row.original.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span> },
    { accessorKey: 'name', header: 'Institutional Event', cell: ({ row }) => <span className="font-black text-slate-900 uppercase tracking-tighter">{row.original.name}</span> },
    { accessorKey: 'description', header: 'Directive Context' },
    {
      id: 'actions',
      cell: ({ row }) => (
        <button onClick={() => deleteHoliday(row.original.id)} className="text-red-400 hover:text-red-600 p-1">
          <Trash2 className="w-4 h-4" />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-black text-slate-900 tracking-tight">Holiday Synchronization</h1>
           <p className="text-slate-500 text-sm font-medium">Coordinate organization-wide breaks across all departmental pods.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Certify Holiday
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden min-h-[400px]">
        <DataTable columns={columns} data={holidays} isLoading={isLoading} searchKey="name" />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Certify Institutional Holiday">
         <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Holiday Designation</label>
                <input 
                    required
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 font-bold"
                    placeholder="e.g. Founder's Day"
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                />
            </div>
            <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Calendar Date</label>
                <input 
                    type="date"
                    required
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 font-bold"
                    value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
                />
            </div>
            <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contextual Description</label>
                <textarea 
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-900 font-medium"
                    placeholder="Optional directive details..."
                    rows={3}
                    value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                />
            </div>
            <div className="flex justify-end pt-4">
                <button type="submit" className="bg-slate-900 text-white px-10 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest">
                    Synchronize Globally
                </button>
            </div>
         </form>
      </Modal>
    </div>
  );
}
