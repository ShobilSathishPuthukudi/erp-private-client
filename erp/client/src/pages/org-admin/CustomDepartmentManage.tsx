import { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Power, 
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  Database
} from 'lucide-react';
import { Modal } from '../../components/shared/Modal';
import CustomDepartmentCreate from './CustomDepartmentCreate';

export default function CustomDepartmentManage() {
  const [customDepts, setCustomDepts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<any>(null);

  useEffect(() => {
    fetchCustomDepts();
  }, []);

  const fetchCustomDepts = async () => {
    try {
      const response = await fetch('/api/departments');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setCustomDepts(data.filter((d: any) => d.type === 'Custom'));
    } catch (error) {
      console.error("Failed to fetch custom departments", error);
    }
  };

  const [deleteError, setDeleteError] = useState('');

  const handleDelete = async (dept: any) => {
    if (dept.employeeCount > 0) {
      setDeleteError(`Cannot delete "${dept.name}" because it has active employees assigned.`);
      return;
    }
    try {
      const response = await fetch(`/api/departments/${dept.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');
      fetchCustomDepts();
    } catch (error) {
      console.error("Delete error", error);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    try {
      const newStatus = (currentStatus?.toLowerCase() === 'active') ? 'inactive' : 'active';
      const response = await fetch(`/api/departments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) fetchCustomDepts();
    } catch (error) {
      console.error("Toggle status error", error);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Manage Custom Modules</h1>
          <p className="text-slate-500 mt-1">Specialized departments with tailored feature sets and permissions.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-slate-900/10 hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Build Custom Module
        </button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="5xl"
        hideHeader={true}
      >
        <CustomDepartmentCreate 
          initialData={selectedDept}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedDept(null);
          }}
          onSuccess={() => {
            fetchCustomDepts();
          }}
        />
      </Modal>

      {deleteError && (
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="bg-rose-500 p-2 rounded-lg">
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-rose-700">{deleteError}</p>
          </div>
          <button onClick={() => setDeleteError('')} className="text-slate-400 hover:text-slate-600 font-bold text-sm">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customDepts.map((dept) => (
          <div key={dept.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-xl hover:shadow-slate-200/50 transition-all hover:translate-y-[-4px]">
            <div className={`h-2 ${
              dept.status === 'Active' ? 'bg-green-500' : 
              dept.status === 'Inactive' ? 'bg-rose-500' : 'bg-slate-300'
            }`}></div>
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <h3 className="text-xl font-bold text-slate-900 mb-2 truncate" title={dept.name}>{dept.name}</h3>
                      <div className="flex flex-wrap gap-2">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                          dept.status?.toLowerCase() === 'active' ? 'bg-green-100 text-green-700' : 
                          dept.status?.toLowerCase() === 'inactive' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {dept.status}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest whitespace-nowrap pt-1">{dept.employeeCount || 0} Users</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 bg-slate-50 p-3 rounded-2xl border border-slate-100 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-800 transition-all duration-300 shadow-sm shadow-slate-200/50">
                      <Database className="w-6 h-6" />
                    </div>
                  </div>

              <div className="space-y-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-1">Active Features</p>
                <div className="flex flex-wrap gap-2">
                  {(dept.features || []).map((f: string) => (
                    <span key={f} className="bg-slate-100 text-slate-600 text-[10px] px-2.5 py-1 rounded-lg font-bold">
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700 uppercase">
                  {(dept.adminName || 'U')[0]}
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Admin Managed By</p>
                  <p className={`text-xs font-bold ${!dept.adminName ? 'text-rose-500' : 'text-slate-700'}`}>{dept.adminName || 'Unassigned'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button 
                  onClick={() => {
                    setSelectedDept(dept);
                    setIsModalOpen(true);
                  }}
                  className="p-3 bg-slate-50/50 text-slate-400 hover:text-slate-900 hover:bg-slate-100/50 hover:border-slate-200 rounded-xl transition-all border border-slate-100 active:scale-[0.95]"
                  title="Edit Module"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  className="p-3 bg-slate-50/50 text-slate-400 hover:text-rose-600 hover:bg-rose-100/50 hover:border-rose-200 rounded-xl transition-all border border-slate-100 active:scale-[0.95]"
                  onClick={() => handleDelete(dept)}
                  title="Delete Module"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button 
                  className={`p-3 rounded-xl transition-all border border-slate-100 active:scale-[0.95] ${
                    dept.status?.toLowerCase() === 'active' 
                    ? 'bg-rose-50/50 text-slate-400 hover:text-rose-600 hover:bg-rose-100/50 hover:border-rose-200' 
                    : 'bg-green-50/50 text-slate-400 hover:text-green-600 hover:bg-green-100/50 hover:border-green-200'
                  }`}
                  onClick={() => handleToggleStatus(dept.id, dept.status)}
                  title={dept.status?.toLowerCase() === 'active' ? 'Deactivate' : 'Activate'}
                >
                  <Power className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        <div className="bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 p-8 flex flex-col items-center justify-center text-center opacity-70 group hover:opacity-100 transition-all">
          <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Plus className="w-8 h-8 text-slate-400" />
          </div>
          <h4 className="font-bold text-slate-900">New Vision?</h4>
          <p className="text-xs text-slate-500 mt-2 max-w-[200px]">Create an entirely new departmental structure from scratch.</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="mt-6 text-sm font-bold text-blue-600 flex items-center"
          >
            Start Building <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
        <ShieldCheck className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 text-white/5 rotate-12" />
        <div className="max-w-xl relative z-10">
          <h2 className="text-2xl font-bold mb-3 font-display">Feature Control & Deletion Safety</h2>
          <p className="text-slate-400 text-sm leading-relaxed font-medium">
            Custom modules can only be deleted if they are not linked to any active employees, 
            students, or tasks. This prevents data fragmentation and ensures institutional integrity. 
            For modules with active data, use <b>Deactivate</b> to suspend access while preserving records.
          </p>
        </div>
        <button className="px-6 py-4 bg-white text-slate-900 font-bold rounded-2xl shadow-xl hover:scale-[1.05] transition-all relative z-10">
          Data Integrity Policy
        </button>
      </div>
    </div>
  );
}
