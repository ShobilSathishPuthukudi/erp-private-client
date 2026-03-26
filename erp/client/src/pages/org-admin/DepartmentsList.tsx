import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  Power, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { Modal } from '../../components/shared/Modal';
import DepartmentCreate from './DepartmentCreate';

export default function DepartmentsList() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<any>(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setDepartments(data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch departments", error);
      setLoading(false);
    }
  };

  const toggleStatus = async (id: number, currentStatus: string) => {
    try {
      const newStatus = (currentStatus === 'active' || currentStatus === 'Active') ? 'inactive' : 'active';
      const response = await fetch(`/api/departments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) fetchDepartments();
    } catch (error) {
      console.error("Failed to toggle status", error);
    }
  };

  const deleteDept = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this department?")) return;
    try {
      const response = await fetch(`/api/departments/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) fetchDepartments();
    } catch (error) {
      console.error("Failed to delete department", error);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');

  const filteredDepts = departments.filter(dept => 
    (dept.name.toLowerCase().includes(searchTerm.toLowerCase()) || (dept.admin?.name || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterType === 'All' || dept.type === filterType)
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 flex items-center w-fit"><CheckCircle2 className="w-3 h-3 mr-1" /> Active</span>;
      case 'Inactive': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 flex items-center w-fit"><Power className="w-3 h-3 mr-1" /> Inactive</span>;
      default: return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 flex items-center w-fit"><AlertCircle className="w-3 h-3 mr-1" /> Draft</span>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">All Departments</h1>
          <p className="text-slate-500 mt-1">The master list of organizational units and their administrators.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-slate-900/10 hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Register Dept
          </button>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="4xl"
        hideHeader={true}
      >
        <DepartmentCreate 
          initialData={selectedDept}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedDept(null);
          }}
          onSuccess={() => {
            fetchDepartments();
          }}
        />
      </Modal>

      {/* Controls & Cards Grid */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name or admin..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 px-3 uppercase tracking-widest">
              <Filter className="w-3.5 h-3.5" />
              <span>Type</span>
            </div>
            <select 
              className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-0 text-slate-700"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="Operations">Operations</option>
              <option value="Finance">Finance</option>
              <option value="HR">HR</option>
              <option value="Sales">Sales</option>
              <option value="Custom">Custom</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
             <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-4">Hydrating Institutional Data...</p>
          </div>
        ) : filteredDepts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed text-slate-400">
            No departments found matching your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDepts.map((dept) => (
              <div key={dept.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-xl hover:shadow-slate-200/50 transition-all hover:translate-y-[-4px]">
                <div className={`h-2 ${
                  dept.status === 'active' || dept.status === 'Active' ? 'bg-green-500' : 'bg-rose-500'
                }`}></div>
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <h3 className="text-xl font-bold text-slate-900 mb-2 truncate" title={dept.name}>{dept.name}</h3>
                      <div className="flex flex-wrap gap-2">
                        {getStatusBadge(dept.status === 'active' || dept.status === 'Active' ? 'Active' : 'Inactive')}
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold uppercase tracking-widest whitespace-nowrap">
                          {dept.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 bg-slate-50 p-3 rounded-2xl border border-slate-100 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-800 transition-all duration-300 shadow-sm shadow-slate-200/50">
                      <Building2 className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700 uppercase">
                      {(dept.admin?.name || 'U')[0]}
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Admin Managed By</p>
                      <p className={`text-xs font-bold ${!dept.admin ? 'text-rose-500' : 'text-slate-700'}`}>{dept.admin?.name || 'Unassigned'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button 
                      onClick={() => {
                        setSelectedDept(dept);
                        setIsModalOpen(true);
                      }}
                      className="p-3 bg-slate-50/50 text-slate-400 hover:text-slate-900 hover:bg-slate-100/50 hover:border-slate-200 rounded-xl transition-all border border-slate-100 active:scale-[0.95]"
                      title="Edit Department"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => toggleStatus(dept.id, dept.status)}
                      className={`p-3 rounded-xl transition-all border border-slate-100 active:scale-[0.95] ${
                        dept.status === 'active' || dept.status === 'Active' 
                        ? 'bg-rose-50/50 text-slate-400 hover:text-rose-600 hover:bg-rose-100/50 hover:border-rose-200' 
                        : 'bg-green-50/50 text-slate-400 hover:text-green-600 hover:bg-green-100/50 hover:border-green-200'
                      }`}
                      title={dept.status === 'active' ? 'Deactivate' : 'Activate'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    {dept.type === 'Custom' && (
                      <button 
                        onClick={() => deleteDept(dept.id)}
                        className="p-3 bg-slate-50/50 text-slate-400 hover:text-rose-600 hover:bg-rose-100/50 hover:border-rose-200 rounded-xl transition-all border border-slate-100 active:scale-[0.95]"
                        title="Delete Department"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 p-8 flex flex-col items-center justify-center text-center opacity-70 group hover:opacity-100 transition-all"
            >
              <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Plus className="w-8 h-8 text-slate-400" />
              </div>
              <h4 className="font-bold text-slate-900">Add Department</h4>
              <p className="text-xs text-slate-500 mt-2 max-w-[200px]">Expand your organizational structure with a new functional unit.</p>
              <div className="mt-6 text-sm font-bold text-blue-600 flex items-center">
                Get Started <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </button>
          </div>
        )}
      </div>

      <div className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
        <ShieldCheck className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 text-white/5 rotate-12" />
        <div className="max-w-xl relative z-10">
          <h2 className="text-2xl font-bold mb-3 font-display">Institutional Integrity & Continuity</h2>
          <p className="text-slate-400 text-sm leading-relaxed font-medium">
            Departments are the core building blocks of your ERP. Ensure each and every unit has a designated administrator 
            for smooth workflow execution. Deactivating a department will suspend all related dashboards while preserving 
            historical audit trails.
          </p>
        </div>
        <button className="px-6 py-4 bg-white text-slate-900 font-bold rounded-2xl shadow-xl hover:scale-[1.05] transition-all relative z-10">
          Governance Policy
        </button>
      </div>
    </div>
  );
}
