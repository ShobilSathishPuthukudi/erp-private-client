import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { 
  Users, 
  Search, 
  Copy, 
  ExternalLink, 
  Zap, 
  ShieldCheck,
  Building2,
  Mail,
  Smartphone
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Employee {
  uid: string;
  name: string;
  email: string;
  role: string;
  status: string;
  deptId: number;
  department?: { name: string };
  subDepartment?: string;
  phone?: string;
}

export default function EmployeeCards() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await api.get('/hr/employees');
        setEmployees(res.data);
        setFilteredEmployees(res.data);
      } catch (error) {
        toast.error('Failed to load employee identity nodes');
      } finally {
        setIsLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    const filtered = employees.filter(emp => 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.uid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEmployees(filtered);
  }, [searchTerm, employees]);

  const copyPortalLink = (uid: string) => {
    const link = `${window.location.origin}/dashboard/tasks?target=${uid}`;
    navigator.clipboard.writeText(link);
    toast.success(`Portal access node copied for ${uid}`, {
      icon: '🔐',
      style: {
        borderRadius: '12px',
        background: '#0f172a',
        color: '#fff',
      },
    });
  };

  const CardSkeleton = () => (
    <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm animate-pulse space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-slate-100 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-1/2" />
        </div>
      </div>
      <div className="h-20 bg-slate-50 rounded-2xl" />
      <div className="flex gap-2">
        <div className="h-10 bg-slate-100 rounded-xl flex-1" />
        <div className="h-10 bg-slate-100 rounded-xl flex-1" />
      </div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto p-4 lg:p-8 animate-in fade-in duration-700">
      <PageHeader 
        title="Employee identity hub"
        description="Unique 'Click to Fill' access nodes for institutional staff portals"
        icon={Zap}
        action={
          <div className="relative group w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input 
              type="text"
              placeholder="Search identity nodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm shadow-sm"
            />
          </div>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-slate-200">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-black text-slate-900 mb-2">No Identity Nodes Found</h3>
          <p className="text-slate-500 font-medium">Refine your search parameters to locate specific institutional staff.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEmployees.map((emp) => (
            <div 
              key={emp.uid}
              className="group bg-white rounded-[2.5rem] p-6 border border-slate-200 shadow-xl shadow-slate-200/40 hover:border-blue-500 hover:shadow-blue-500/10 transition-all duration-500 relative overflow-hidden flex flex-col"
            >
              {/* Card Decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
              
              <div className="flex items-start justify-between mb-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-xl shadow-slate-900/20 group-hover:scale-110 transition-transform duration-500 ">
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 tracking-tight leading-tight group-hover:text-blue-600 transition-colors uppercase text-sm">
                      {emp.name}
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">
                      Node: <span className="text-slate-600">{emp.uid}</span>
                    </p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                  emp.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                }`}>
                  {emp.status}
                </div>
              </div>

              {/* Identity Details */}
              <div className="space-y-4 mb-8 bg-slate-50/50 p-4 rounded-[1.5rem] border border-slate-100 flex-1">
                <div className="flex items-center gap-3 text-slate-600">
                  <ShieldCheck className="w-4 h-4 opacity-40 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-tight truncate">{emp.role || 'Personnel'}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <Building2 className="w-4 h-4 opacity-40 shrink-0" />
                  <span className="text-xs font-medium truncate">{emp.department?.name || 'Institutional'}</span>
                </div>
                {emp.email && (
                  <div className="flex items-center gap-3 text-slate-600">
                    <Mail className="w-4 h-4 opacity-40 shrink-0" />
                    <span className="text-xs font-medium truncate">{emp.email}</span>
                  </div>
                )}
                {emp.phone && (
                  <div className="flex items-center gap-3 text-slate-600">
                    <Smartphone className="w-4 h-4 opacity-40 shrink-0" />
                    <span className="text-xs font-medium truncate">{emp.phone}</span>
                  </div>
                )}
              </div>

              {/* Action Nodes */}
              <div className="flex gap-3 relative z-10">
                <button 
                  onClick={() => copyPortalLink(emp.uid)}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-slate-900/10"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Click to Fill
                </button>
                <a 
                  href={`/dashboard/tasks?target=${emp.uid}`}
                  className="px-4 flex items-center justify-center bg-white border border-slate-200 text-slate-400 py-3.5 rounded-2xl hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm group/btn"
                >
                  <ExternalLink className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
