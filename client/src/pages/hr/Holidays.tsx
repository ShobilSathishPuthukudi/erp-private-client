import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Plus, Trash2, CalendarDays, Clock, MapPin } from 'lucide-react';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import { PageHeader } from '@/components/shared/PageHeader';
import type { ColumnDef } from '@tanstack/react-table';
import toast from 'react-hot-toast';
import { toSentenceCase } from '@/lib/utils';

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
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
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
    { 
      accessorKey: 'date', 
      header: 'Date', 
      cell: ({ row }) => <span className="font-mono font-black text-slate-500">{new Date(row.original.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span> 
    },
    { 
      accessorKey: 'name', 
      header: 'Institutional event', 
      cell: ({ row }) => <span className="font-black text-slate-900 tracking-tighter">{toSentenceCase(row.original.name)}</span> 
    },
    { 
      accessorKey: 'description', 
      header: 'Description',
      cell: ({ row }) => toSentenceCase(row.original.description || '')
    },
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
      <PageHeader 
        title="Holiday Synchronization"
        description="Coordinate organization-wide breaks across all departmental pods."
        icon={CalendarDays}
        action={
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-900 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Certify Holiday
          </button>
        }
      />

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden min-h-[400px]">
        <DataTable 
          columns={columns} 
          data={holidays} 
          isLoading={isLoading} 
          searchKey="name" 
          onRowClick={(h) => {
            setSelectedHoliday(h);
            setIsDetailOpen(true);
          }}
        />
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Certify Institutional Holiday">
         <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Holiday Designation</label>
                <input 
                    required
                    className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900 font-bold"
                    placeholder="Founder's Day"
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

      {/* Holiday Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Institutional Holiday Details">
        {selectedHoliday && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-50 -mx-6 -mt-6 p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{toSentenceCase(selectedHoliday.name)}</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    ID: #{selectedHoliday.id} · Verified Global Break
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-black uppercase tracking-widest">
                Certified
              </span>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/50">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Contextual Description</div>
                <p className="text-slate-700 text-sm font-medium leading-relaxed">
                  {selectedHoliday.description || "No specific administrative directive provided for this holiday."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-100 bg-white">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Calendar Timestamp</div>
                  <div className="flex items-center text-xs text-slate-900 font-black">
                    <Clock className="w-4 h-4 mr-2 text-slate-400" />
                    {new Date(selectedHoliday.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-100 bg-white">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Scope of Break</div>
                  <div className="flex items-center text-xs text-slate-900 font-black">
                    <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                    All Departments
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200 flex justify-end gap-3">
               <button 
                onClick={() => {
                  if (confirm('Are you sure you want to revoke this holiday?')) {
                    deleteHoliday(selectedHoliday.id);
                    setIsDetailOpen(false);
                  }
                }}
                className="px-6 py-2.5 text-red-500 hover:bg-red-50 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              >
                Revoke Holiday
              </button>
              <button 
                onClick={() => setIsDetailOpen(false)}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/20"
              >
                Dismiss Detail
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
