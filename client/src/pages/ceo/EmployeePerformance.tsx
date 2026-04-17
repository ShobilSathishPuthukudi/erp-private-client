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
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                <Award className="w-6 h-6" />
             </div>
             <h1 className="text-3xl font-black text-slate-900 tracking-tight">Workforce Performance</h1>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Individual Productivity Index & Institutional contribution Telemetry</p>
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

      {/* Individual Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredEmployees.map((employee) => (
          <div 
            key={employee.uid} 
            className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/20 hover:shadow-2xl hover:shadow-slate-200/40 transition-all duration-500 group overflow-hidden"
          >
            <div className="p-8">
              {/* Card Header */}
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-2xl shadow-xl shadow-slate-900/20 group-hover:scale-110 transition-transform duration-500">
                    {employee.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      {employee.name}
                      {employee.productivityScore >= 95 && <Award className="w-4 h-4 text-amber-500" />}
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{employee.role}</p>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md text-[9px] font-bold uppercase tracking-tight">
                       <Briefcase className="w-3 h-3" /> {employee.dept}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-4xl font-black tracking-tighter ${
                    employee.productivityScore >= 90 ? 'text-emerald-500' : 
                    employee.productivityScore >= 75 ? 'text-blue-500' : 
                    employee.productivityScore >= 60 ? 'text-amber-500' : 'text-rose-500'
                  }`}>
                    {employee.productivityScore}%
                  </div>
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Efficiency</p>
                </div>
              </div>

              {/* Progress Pillar */}
              <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden mb-8">
                <div 
                  className={`h-full transition-all duration-1000 ${
                    employee.productivityScore >= 90 ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]' : 
                    employee.productivityScore >= 75 ? 'bg-blue-500' : 
                    employee.productivityScore >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                  }`} 
                  style={{ width: `${employee.productivityScore}%` }}
                ></div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100/50 group-hover:bg-white transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tasks</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-black text-slate-900">{employee.metrics.taskScore}%</span>
                    <span className="text-[10px] font-bold text-slate-400">{employee.metrics.overdueTasks} Overdue</span>
                  </div>
                </div>
                <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100/50 group-hover:bg-white transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Leaves</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-black text-slate-900">{employee.metrics.leaveScore}%</span>
                    <span className="text-[10px] font-bold text-slate-400">{employee.metrics.agedLeaves} Aged</span>
                  </div>
                </div>
              </div>

              {/* Sales Specific Indicator */}
              {(employee.dept?.toLowerCase().includes('sales') || employee.metrics.leadCount > 0) && (
                <div className="mt-4 p-4 rounded-3xl bg-blue-50/50 border border-blue-100 flex items-center justify-between group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                  <div className="flex items-center gap-3">
                     <Zap className="w-4 h-4 text-blue-600 group-hover:text-white" />
                     <span className="text-[10px] font-black uppercase tracking-widest">Lead Acquisition Level</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                       <p className="text-[9px] font-bold opacity-50 uppercase leading-none mb-1">Conversion</p>
                       <p className="text-xs font-black">{employee.metrics.salesScore}%</p>
                    </div>
                    <div className="w-px h-6 bg-blue-200 group-hover:bg-white/20"></div>
                    <div className="text-right">
                       <p className="text-[9px] font-bold opacity-50 uppercase leading-none mb-1">Total</p>
                       <p className="text-xs font-black">{employee.metrics.leadCount}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Action Bar */}
            <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{employee.uid}</span>
               <button
                 onClick={() => openDrillDown(employee)}
                 className="flex items-center gap-2 text-[10px] font-black text-slate-900 uppercase tracking-widest bg-white px-4 py-2 rounded-xl shadow-sm hover:-translate-x-1 transition-all"
               >
                  Drill Down Analytics <ChevronRight className="w-3.5 h-3.5" />
               </button>
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
