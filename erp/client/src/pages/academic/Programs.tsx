import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { Edit2, Trash2, Library, Landmark, Clock, Users, ShieldAlert, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

interface Program {
  id: number;
  name: string;
  universityId: number;
  duration: number;
  subDeptId: number;
  intakeCapacity: number;
  type: string;
  university?: {
    name: string;
  };
  createdAt: string;
}

interface University {
  id: number;
  name: string;
}

export default function Programs() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Program | null>(null);

  const { register, handleSubmit, reset, formState: { isSubmitting }, watch } = useForm();
  const selectedType = watch('type');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [progRes, uniRes] = await Promise.all([
        api.get('/academic/programs'),
        api.get('/academic/universities')
      ]);
      setPrograms(progRes.data);
      setUniversities(uniRes.data);
    } catch (error) {
      toast.error('Failed to fetch academic frameworks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    reset({ name: '', universityId: '', duration: 12, intakeCapacity: 50, type: 'Online' });
    setIsModalOpen(true);
  };

  const openEditModal = (item: Program) => {
    setEditingItem(item);
    reset({ 
      name: item.name, 
      universityId: item.universityId || '', 
      duration: item.duration,
      intakeCapacity: item.intakeCapacity,
      type: item.type
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      if (editingItem) {
        await api.put(`/academic/programs/${editingItem.id}`, data);
        toast.success('Program topology updated');
      } else {
        await api.post('/academic/programs', data);
        toast.success('Initialized new academic program node');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Processing logic breakdown');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this active program? This halts all ongoing structural telemetry.')) return;
    try {
      await api.delete(`/academic/programs/${id}`);
      toast.success('Program wiped from matrix.');
      fetchData();
    } catch (error) {
      toast.error('Deletion block failed.');
    }
  };

  const columns: ColumnDef<Program>[] = [
    { 
      accessorKey: 'name', 
      header: 'Program Title', 
      cell: ({ row }) => (
        <div className="flex flex-col">
          <Link to={`/dashboard/academic/programs/${row.original.id}`} className="font-bold text-slate-900 hover:text-blue-600 transition-colors">
            {row.original.name}
          </Link>
          <span className="text-[10px] font-mono text-slate-400">UUID-PRG-{row.original.id}</span>
        </div>
      ) 
    },
    { 
      id: 'university', 
      header: 'Affiliated University', 
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-600">
            {row.original.university?.name || 'Local Institutional Core'}
          </span>
        </div>
      )
    },
    { 
      accessorKey: 'duration', 
      header: 'Duration', 
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-bold text-slate-700">{row.original.duration} Months</span>
        </div>
      ) 
    },
    { 
      accessorKey: 'type', 
      header: 'Sub-Department',
      cell: ({ row }) => (
        <span className={`px-2.5 py-1 text-[10px] rounded-full font-bold uppercase tracking-wider ${
          row.original.type === 'Online' ? 'bg-blue-100 text-blue-700' :
          row.original.type === 'Skill' ? 'bg-purple-100 text-purple-700' :
          row.original.type === 'BVoc' ? 'bg-orange-100 text-orange-700' :
          'bg-slate-100 text-slate-700'
        }`}>
          {row.original.type}
        </span>
      )
    },
    { 
      accessorKey: 'intakeCapacity', 
      header: 'Intake Velocity', 
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-600">{row.original.intakeCapacity} Seats / Session</span>
        </div>
      ) 
    },
    {
      id: 'actions',
      header: 'Controls',
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center space-x-2">
            <button onClick={() => openEditModal(item)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-all active:scale-95 shadow-sm border border-slate-200 bg-white">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-all active:scale-95 shadow-sm border border-red-100 bg-white">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20">
              <Library className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Academic Architecture</h1>
          </div>
          <p className="text-slate-500 font-medium ml-15">Configure multi-university programs and cross-departmental duration tracks.</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl transition-all shadow-xl shadow-slate-900/20 active:scale-95 font-bold"
        >
          <BookOpen className="w-5 h-5" />
          <span>Formulate Program</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <DataTable 
          columns={columns} 
          data={programs} 
          isLoading={isLoading} 
          searchKey="name" 
          searchPlaceholder="Locate by program syntax..." 
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? "Refactor Program Model" : "Initialize Academic Pipeline"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="col-span-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Standardized Program Title</label>
              <div className="relative group">
                <Library className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                <input
                  {...register('name', { required: true })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900"
                  placeholder="e.g. Master of Computer Applications"
                />
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Parent University Reference</label>
              <div className="relative group">
                <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                <select
                  {...register('universityId', { required: true })}
                  disabled={!!editingItem}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900 disabled:opacity-50 disabled:bg-slate-100 cursor-not-allowed"
                >
                  <option value="">-- Institutional Mapping Required --</option>
                  {universities.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              {editingItem && (
                <p className="mt-1.5 text-[10px] text-orange-600 font-bold uppercase ml-1">Institutional parent is immutable after deployment.</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Trajectory (Months)</label>
              <div className="relative group">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                <input
                  type="number"
                  {...register('duration', { required: true, valueAsNumber: true })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900"
                  min="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Intake Velocity (Max Seats)</label>
              <div className="relative group">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                <input
                  type="number"
                  {...register('intakeCapacity', { required: true, valueAsNumber: true })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900"
                  min="1"
                />
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Sub-Department Assignment</label>
              <select
                {...register('type', { required: true })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900"
              >
                <option value="BVoc">BVoc Gateway</option>
                <option value="Skill">Skill Development</option>
                <option value="Online">Online Learning</option>
                <option value="OpenSchool">OpenSchool Access</option>
              </select>
              {editingItem && selectedType !== editingItem.type && (
                <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-orange-700 font-medium">Changing sub-dept affects future enrollment routing. Existing data structures remain persistent.</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-3 mt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
            >
              Abort Routine
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-slate-900/20"
            >
              {isSubmitting ? 'Syncing...' : (editingItem ? 'Serialize Changes' : 'Execute Generation')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
