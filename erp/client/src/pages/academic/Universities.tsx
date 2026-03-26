import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { DataTable } from '@/components/shared/DataTable';
import { Modal } from '@/components/shared/Modal';
import type { ColumnDef } from '@tanstack/react-table';
import { Edit2, Trash2, Building2, Globe, ShieldCheck, FileText, Upload, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

interface University {
  id: number;
  name: string;
  status: 'active' | 'inactive';
  accreditation?: string;
  websiteUrl?: string;
  affiliationDoc?: string;
  totalPrograms?: number;
  createdAt: string;
}

export default function Universities() {
  const [universities, setUniversities] = useState<University[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<University | null>(null);
  const [uploading, setUploading] = useState(false);

  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting } } = useForm();
  const affiliationDocPath = watch('affiliationDoc');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/academic/universities');
      setUniversities(res.data);
    } catch (error) {
      toast.error('Failed to fetch operational configurations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('document', file);

    try {
      setUploading(true);
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setValue('affiliationDoc', res.data.filePath);
      toast.success('Affiliation document uploaded to S3');
    } catch (error) {
      toast.error('File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    reset({ name: '', status: 'active', accreditation: '', websiteUrl: '', affiliationDoc: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (item: University) => {
    setEditingItem(item);
    reset({ 
      name: item.name, 
      status: item.status, 
      accreditation: item.accreditation || '', 
      websiteUrl: item.websiteUrl || '', 
      affiliationDoc: item.affiliationDoc || '' 
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: any) => {
    try {
      if (editingItem) {
        await api.put(`/academic/universities/${editingItem.id}`, data);
        toast.success('University topology updated');
      } else {
        await api.post('/academic/universities', data);
        toast.success('Deployed new university endpoint');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Processing logic breakdown');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Eradicate this university infrastructure permanentally? This cascades down its program topology recursively.')) return;
    try {
      await api.delete(`/academic/universities/${id}`);
      toast.success('University topology terminated.');
      fetchData();
    } catch (error) {
      toast.error('Deletion protocol was preempted by the system constraints.');
    }
  };

  const columns: ColumnDef<University>[] = [
    { 
      accessorKey: 'name', 
      header: 'University Designation', 
      cell: ({ row }) => (
        <div className="flex flex-col">
          <Link to={`/dashboard/academic/universities/${row.original.id}`} className="font-bold text-slate-900 hover:text-blue-600 transition-colors">
            {row.original.name}
          </Link>
          {row.original.websiteUrl && (
            <a href={row.original.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-400 flex items-center gap-1 hover:text-blue-500">
              <Globe className="w-2.5 h-2.5" />
              Institutional Portal
            </a>
          )}
        </div>
      ) 
    },
    { 
      accessorKey: 'accreditation', 
      header: 'Accreditation',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <ShieldCheck className={`w-4 h-4 ${row.original.accreditation ? 'text-blue-500' : 'text-slate-300'}`} />
          <span className="text-sm font-medium text-slate-600">{row.original.accreditation || 'Pending Review'}</span>
        </div>
      )
    },
    { 
      accessorKey: 'totalPrograms', 
      header: 'Programs',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs border border-blue-100">
            {row.original.totalPrograms || 0}
          </div>
          <span className="text-xs text-slate-500 font-medium">Active Offerings</span>
        </div>
      )
    },
    { 
      accessorKey: 'status', 
      header: 'Status',
      cell: ({ row }) => {
        const active = row.original.status === 'active';
        return (
          <span className={`px-2.5 py-1 text-[10px] rounded-full font-bold uppercase tracking-wider ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
            {row.original.status}
          </span>
        );
      }
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
              <Building2 className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">University Architecture</h1>
          </div>
          <p className="text-slate-500 font-medium ml-15">IITS RPS Accredited Institution Registry & Compliance Ledger</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl transition-all shadow-xl shadow-slate-900/20 active:scale-95 font-bold"
        >
          <Building2 className="w-5 h-5" />
          <span>Onboard Institution</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <DataTable 
          columns={columns} 
          data={universities} 
          isLoading={isLoading} 
          searchKey="name" 
          searchPlaceholder="Locate by institutional syntax..." 
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? "Reconcile University Schema" : "Initialize Internal University Topology"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="col-span-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Institutional Designation</label>
              <div className="relative group">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                <input
                  {...register('name', { required: true })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900"
                  placeholder="e.g. Cambridge International"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Accreditation (UGC/AICTE)</label>
              <div className="relative group">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                <input
                  {...register('accreditation')}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900"
                  placeholder="e.g. UGC Category-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Official Institutional URL</label>
              <div className="relative group">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                <input
                  {...register('websiteUrl')}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-medium text-slate-900"
                  placeholder="https://university.edu"
                />
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Affiliation Compliance Document</label>
              <div className="relative">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="doc-upload"
                />
                <label 
                  htmlFor="doc-upload"
                  className={`flex items-center justify-between w-full px-4 py-3 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                    affiliationDocPath 
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700' 
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {affiliationDocPath ? <CheckCircle2 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                    <span className="font-bold text-sm">
                      {uploading ? 'Transmitting to S3...' : (affiliationDocPath ? 'Affiliation Vaulted' : 'Upload Affiliation PDF')}
                    </span>
                  </div>
                  {affiliationDocPath && (
                    <span className="text-[10px] font-mono opacity-60">S-3 SECURED</span>
                  )}
                </label>
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Operational State</label>
              <select
                {...register('status')}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-bold text-slate-900"
              >
                <option value="active">Active Infrastructure</option>
                <option value="inactive">Sunsetted / Archive</option>
              </select>
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-3 mt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
            >
              Abort
            </button>
            <button
              type="submit"
              disabled={isSubmitting || uploading}
              className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-slate-900/20"
            >
              {isSubmitting ? 'Syncing...' : (editingItem ? 'Update Node' : 'Initialize Node')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
