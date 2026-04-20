import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Users,
  CheckSquare,
  Clock,
  Zap,
  Search,
  ChevronRight,
  TrendingDown,
  Award,
  Briefcase,
  X,
  ListChecks,
  CalendarOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/shared/Modal';

interface EmployeeMetric {
  uid: string;
  name: string;
  role: string;
  dept: string;
  metrics: {
    overdueTasks: number;
    agedLeaves: number;
    leadCount: number;
    taskScore: number;
    leaveScore: number;
    salesScore: number;
  };
  productivityScore: number;
}

export default function EmployeePerformance() {
  const [employees, setEmployees] = useState<EmployeeMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [drillEmployee, setDrillEmployee] = useState<EmployeeMetric | null>(null);
  const [drillData, setDrillData] = useState<any>(null);
  const [drillLoading, setDrillLoading] = useState(false);

  useEffect(() => {
    fetchPerformance();
  }, []);

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      const res = await api.get('/ceo/performance/employees');
      setEmployees(res.data || []);
    } catch (error) {
      toast.error('Failed to load employee performance metrics');
    } finally {
      setLoading(false);
    }
  };

  const openDrillDown = async (employee: EmployeeMetric) => {
    setDrillEmployee(employee);
    setDrillData(null);
    setDrillLoading(true);
    try {
      const { data } = await api.get(`/ceo/details/employee?uid=${employee.uid}`);
      setDrillData(data);
    } catch {
      toast.error('Failed to load employee details');
    } finally {
      setDrillLoading(false);
    }
  };

  const departments = ['All', ...new Set(employees.map(e => e.dept))].filter(Boolean);

  const filteredEmployees = employees.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         e.uid.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = departmentFilter === 'All' || e.dept === departmentFilter;
    return matchesSearch && matchesDept;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Analyzing Workforce Productivity...</p>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-6 flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white px-6 py-5 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-0.5">Workforce performance</h1>
            <p className="text-slate-500 font-medium text-sm">Individual Productivity Index & Institutional contribution Telemetry.</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
            <input 
              type="text" 
              placeholder="Search Identity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:bg-white transition-all w-64 shadow-sm"
            />
          </div>
          <select 
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:bg-white transition-all shadow-sm appearance-none cursor-pointer"
          >
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-8 rounded-[40px] text-white relative overflow-hidden shadow-2xl shadow-slate-900/40">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[100px]"></div>
           <div className="relative z-10">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Elite Cohort</p>
              <div className="flex items-baseline gap-2">
                <h4 className="text-5xl font-black">
                  {employees.filter(e => e.productivityScore >= 90).length}
                </h4>
                <span className="text-blue-400 font-black text-sm uppercase">Employees (90%+)</span>
              </div>
           </div>
        </div>
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-bl-[100px]"></div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Risk Attention</p>
           <div className="flex items-baseline gap-2">
             <h4 className="text-5xl font-black text-slate-900">
               {employees.filter(e => e.productivityScore < 60).length}
             </h4>
             <span className="text-rose-500 font-black text-sm uppercase tracking-tighter self-end mb-1 flex items-center gap-1">
               <TrendingDown className="w-4 h-4" /> Critical Watch
             </span>
           </div>
        </div>
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/40">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Aggregate Pulse</p>
           <div className="flex items-baseline gap-2">
             <h4 className="text-5xl font-black text-slate-900">
               {employees.length > 0 ? Math.round(employees.reduce((sum, e) => sum + e.productivityScore, 0) / employees.length) : 0}%
             </h4>
             <span className="text-slate-400 font-black text-sm uppercase tracking-tighter">Avg Score</span>
           </div>
        </div>
      </div>

      {/* Sophisticated Simplicity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredEmployees.map((employee) => (
          <div 
            key={employee.uid} 
            className="group block bg-white rounded-3xl border border-slate-100/80 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden min-h-[260px]"
          >
            <div className="p-6">
              {/* Unified Header: Identity + Core Metric */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-slate-900/10">
                    {employee.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1.5 flex items-center gap-1.5">
                      {employee.name}
                      {employee.productivityScore >= 95 && <Award className="w-4 h-4 text-amber-500" />}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{employee.role}</p>
                    <div className="mt-2 flex items-center gap-1.5">
                       <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{employee.dept}</span>
                       <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                       <span className="text-[9px] font-bold text-slate-400 font-mono tracking-tighter">{employee.uid}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <div className={`text-2xl font-black tracking-tighter leading-none ${
                    employee.productivityScore >= 90 ? 'text-emerald-500' : 
                    employee.productivityScore >= 75 ? 'text-blue-500' : 
                    employee.productivityScore >= 60 ? 'text-amber-500' : 'text-rose-500'
                  }`}>
                    {employee.productivityScore}%
                  </div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Efficiency</p>
                </div>
              </div>

              {/* Streamlined Metrics Row - Robust Grid */}
              <div className="grid grid-cols-3 py-4 border-y border-slate-50">
                <div className="text-center border-r border-slate-100 px-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tasks</p>
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-black text-slate-900">{employee.metrics.taskScore}%</span>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded leading-none mt-1 ${employee.metrics.overdueTasks > 0 ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50'}`}>
                      {employee.metrics.overdueTasks} Overdue
                    </span>
                  </div>
                </div>

                <div className="text-center border-r border-slate-100 px-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Leaves</p>
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-black text-slate-900">{employee.metrics.leaveScore}%</span>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded leading-none mt-1 ${employee.metrics.agedLeaves > 0 ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50'}`}>
                      {employee.metrics.agedLeaves} Aged
                    </span>
                  </div>
                </div>

                <div className="text-center px-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Lead Pulse</p>
                  <div className="flex flex-col items-center">
                    {(employee.dept?.toLowerCase().includes('sales') || employee.metrics.leadCount > 0) ? (
                      <>
                        <span className="text-sm font-black text-slate-900">{employee.metrics.salesScore}%</span>
                        <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded leading-none mt-1">
                          {employee.metrics.leadCount} Leads
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-black text-slate-200">--</span>
                        <span className="text-[9px] font-black text-slate-200 mt-1">DNA N/A</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Minimalist Action & Verification */}
              <div className="mt-6 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                      employee.productivityScore >= 90 ? 'bg-emerald-400' : 
                      employee.productivityScore >= 75 ? 'bg-blue-400' : 
                      employee.productivityScore >= 60 ? 'bg-amber-400' : 'bg-rose-400'
                    }`}></div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Telemetry Verified</span>
                 </div>
                 <button
                   onClick={() => openDrillDown(employee)}
                   className="text-[10px] font-black text-slate-900 uppercase tracking-widest hover:text-blue-600 transition-all flex items-center gap-1.5 p-1 hover:-translate-x-1"
                 >
                    Audit Report <ChevronRight className="w-3.5 h-3.5" />
                 </button>
              </div>
            </div>

            {/* Micro 2px Progress Bar */}
            <div className="h-[2px] w-full bg-slate-50">
              <div 
                className={`h-full transition-all duration-1000 ${
                  employee.productivityScore >= 90 ? 'bg-emerald-500' : 
                  employee.productivityScore >= 75 ? 'bg-blue-500' : 
                  employee.productivityScore >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${employee.productivityScore}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <div className="py-40 flex flex-col items-center justify-center text-center space-y-6 bg-white rounded-[60px] border-2 border-dashed border-slate-100">
           <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center">
              <Users className="w-10 h-10 text-slate-200" />
           </div>
           <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">No Telemetry Matches</h3>
              <p className="text-sm font-bold text-slate-400 mt-2">Adjust your governance filters or check access partition status.</p>
           </div>
           <button
             onClick={() => { setSearchQuery(''); setDepartmentFilter('All'); }}
             className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
           >
             Reset Identity Filters
           </button>
        </div>
      )}

      {/* Employee Drill-Down Modal */}
      <Modal
        isOpen={!!drillEmployee}
        onClose={() => { setDrillEmployee(null); setDrillData(null); }}
        title={drillEmployee ? `${drillEmployee.name} — Productivity Audit` : ''}
      >
        {drillLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900" />
          </div>
        ) : drillData ? (
          <div className="space-y-6 pb-2">
            {/* Score summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Task Score', value: `${drillEmployee?.metrics.taskScore}%` },
                { label: 'Leave Score', value: `${drillEmployee?.metrics.leaveScore}%` },
                { label: 'Productivity', value: `${drillEmployee?.productivityScore}%` },
              ].map(s => (
                <div key={s.label} className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                  <p className="text-2xl font-black text-slate-900">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Tasks */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ListChecks className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                  Recent Tasks ({drillData.tasks?.length ?? 0})
                </h4>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {drillData.tasks?.length > 0 ? drillData.tasks.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs">
                    <span className="font-bold text-slate-800 truncate max-w-[60%]">{t.title}</span>
                    <span className={`font-black uppercase text-[9px] px-2 py-0.5 rounded-full ${
                      t.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      t.status === 'overdue' ? 'bg-rose-100 text-rose-700' :
                      t.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>{t.status}</span>
                  </div>
                )) : <p className="text-xs text-slate-400 font-bold px-1">No tasks found.</p>}
              </div>
            </div>

            {/* Leaves */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CalendarOff className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                  Leave History ({drillData.leaves?.length ?? 0})
                </h4>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {drillData.leaves?.length > 0 ? drillData.leaves.map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between px-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs">
                    <span className="font-bold text-slate-800">{l.fromDate} → {l.toDate}</span>
                    <span className={`font-black uppercase text-[9px] px-2 py-0.5 rounded-full ${
                      l.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      l.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>{l.status}</span>
                  </div>
                )) : <p className="text-xs text-slate-400 font-bold px-1">No leave records found.</p>}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
