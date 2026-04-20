import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
  Building2, 
  Users, 
  CheckCircle2, 
  Activity,
  Filter
} from 'lucide-react';
import { DataTable } from '@/components/shared/DataTable';
import { Link, useSearchParams } from 'react-router-dom';

const MilestoneNode = ({ 
  label, 
  isActive, 
  isCompleted 
}: { 
  label: string; 
  isActive: boolean; 
  isCompleted: boolean;
}) => (
  <div className="flex-1 relative flex flex-col items-center">
    {/* Line connection */}
    <div className={`absolute top-6 left-0 right-0 h-1 ${isCompleted ? 'bg-indigo-600' : 'bg-slate-200'}`} />
    
    <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-500 ${
      isCompleted 
        ? 'bg-indigo-600 border-indigo-200 text-white shadow-lg shadow-indigo-600/20' 
        : isActive 
          ? 'bg-white border-indigo-500 text-indigo-600 shadow-xl' 
          : 'bg-white border-slate-200 text-slate-300'
    }`}>
      {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-indigo-600 animate-pulse' : 'bg-slate-200'}`} />}
    </div>

    <div className="mt-4 text-center">
      <p className={`text-[10px] font-black uppercase tracking-widest ${isActive || isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
        {label}
      </p>
    </div>
  </div>
);

export default function OnboardingPulse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as 'centers' | 'students') || 'centers';
  const setActiveTab = (tab: 'centers' | 'students') => setSearchParams({ tab });

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    centers: { status: string; count: number | string }[];
    students: { status: string; count: number | string }[];
    recentActivity: Array<{
       name: string,
       status: string,
       reviewedBy: string,
       reviewedAt: string,
       reviewStage: string,
       center: { name: string }
    }>;
    recentCenters: Array<{
       name: string,
       status: string,
       auditStatus: string,
       centerStatus: string,
       updatedAt: string
    }>;
  }>({ centers: [], students: [], recentActivity: [], recentCenters: [] });
  const [filterStage, setFilterStage] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedCenter, setSelectedCenter] = useState<any>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (stats.recentActivity?.length > 0 && !selectedStudent) {
      setSelectedStudent(stats.recentActivity[0]);
    }
    if (stats.recentCenters?.length > 0 && !selectedCenter) {
      setSelectedCenter(stats.recentCenters[0]);
    }
  }, [stats.recentActivity, stats.recentCenters]);

  const filteredData = stats.recentActivity.filter((student: any) => {
    if (filterStage === 'all') return true;
    return student.status === filterStage;
  });

  const filteredCentersData = stats.recentCenters.filter((center: any) => {
    if (filterStage === 'all') return true;
    return center.status === filterStage;
  });

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/academic/onboarding/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Telemetry failure:', error);
    } finally {
      setLoading(false);
    }
  };

  const centerStats = {
    proposed: stats.centers.find(c => c.status === 'staged' || c.status === 'PENDING_AUDIT')?.count || 0,
    approved: stats.centers.find(c => c.status === 'active' || c.status === 'APPROVED')?.count || 0,
    rejected: stats.centers.find(c => c.status === 'rejected')?.count || 0
  };

  const studentStats = {
    pending: stats.students.find(s => s.status === 'PENDING_REVIEW')?.count || 0,
    ops: stats.students.find(s => s.status === 'OPS_APPROVED' || s.status === 'PENDING_VERIFICATION')?.count || 0,
    finance: stats.students.find(s => s.status === 'FINANCE_PENDING' || s.status === 'FINANCE_APPROVED')?.count || 0,
    enrolled: stats.students.find(s => s.status === 'ENROLLED')?.count || 0
  };

  return (
    <div className="p-2 space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white px-6 py-5 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/20 shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-0.5">Onboarding <span className="text-indigo-600">traceability</span></h1>
            <p className="text-slate-500 font-medium text-sm flex items-center gap-2">Institutional Audit: Verify student credentials and regional hub status.</p>
          </div>
        </div>

      </div>

      <div className="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-200 w-fit">
        {[
          { id: 'centers', name: 'Study Centers', icon: Building2 },
          { id: 'students', name: 'Students', icon: Users }
        ].map(tab => {
          const count = tab.id === 'centers' 
            ? Number(centerStats.proposed) + Number(centerStats.approved) + Number(centerStats.rejected)
            : Number(studentStats.pending) + Number(studentStats.ops) + Number(studentStats.finance) + Number(studentStats.enrolled);
          
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as 'centers' | 'students');
                setSearchParams({ tab: tab.id });
              }}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200
                ${activeTab === tab.id 
                  ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-900/20 ring-1 ring-slate-200'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}
              `}
            >
              <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} />
              {tab.name}
              <span className={`static ml-1 px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                {count || 0}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center bg-white rounded-3xl border border-slate-100 shadow-sm">
           <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="w-full space-y-6">
          {/* Main Stage Timeline */}
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-indigo-900/5 relative overflow-hidden">
             <div className="flex items-center justify-between mb-12 relative z-10">
                <div className="flex items-center gap-4">
                   <div className={`w-12 h-12 rounded-xl ${activeTab === 'centers' ? 'bg-slate-900' : 'bg-indigo-600'} flex items-center justify-center text-white shadow-lg shadow-indigo-600/10`}>
                      {activeTab === 'centers' ? <Building2 className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                   </div>
                   <div>
                      <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-none mb-1">
                        {activeTab === 'students' 
                          ? (selectedStudent?.name || 'Onboarding Roadmap')
                          : (selectedCenter?.name || 'Onboarding Roadmap')}
                      </h2>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        {activeTab === 'students' && selectedStudent 
                          ? `Current Task: ${selectedStudent.reviewStage || 'Initial Assessment'}` 
                          : activeTab === 'centers' && selectedCenter
                          ? `Current Task: ${selectedCenter.auditStatus === 'pending' ? 'Academic Audit' : selectedCenter.status === 'staged' ? 'Finance Clearing' : 'Final Activation'}`
                          : 'Institutional Enrollment Flow'}
                      </p>
                   </div>
                </div>
                <div className="text-right">
                   <span className="text-3xl font-black text-slate-900 tracking-tighter">
                      {activeTab === 'centers' ? centerStats.approved : studentStats.enrolled}
                   </span>
                   <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Fully Onboarded</span>
                </div>
             </div>

             <div className="flex justify-between items-start mb-4 px-12">
                {activeTab === 'centers' ? (
                   <>
                      {[
                        { label: 'Registration', isCompleted: selectedCenter ? (['staged', 'active'].includes(selectedCenter.status) || selectedCenter.auditStatus === 'approved') : false, isActive: selectedCenter ? (selectedCenter.status === 'proposed' && selectedCenter.auditStatus === 'pending') : false },
                        { label: 'Academic Audit', isCompleted: selectedCenter ? selectedCenter.auditStatus === 'approved' : false, isActive: selectedCenter ? selectedCenter.auditStatus === 'pending' : false },
                        { label: 'Finance Clearing', isCompleted: selectedCenter ? selectedCenter.status === 'active' : false, isActive: selectedCenter ? selectedCenter.status === 'staged' : false },
                        { label: 'Active Hub', isCompleted: selectedCenter ? selectedCenter.status === 'active' : false, isActive: selectedCenter ? selectedCenter.status === 'active' : false }
                      ].map((m, i) => (
                        <MilestoneNode 
                           key={i}
                           label={m.label} 
                           isActive={m.isActive} 
                           isCompleted={m.isCompleted} 
                        />
                      ))}
                   </>
                ) : (
                   <>
                      {[
                        { label: 'Application', status: 'DRAFT', completedStatus: ['PENDING_REVIEW', 'OPS_APPROVED', 'FINANCE_PENDING', 'FINANCE_APPROVED', 'ENROLLED'] },
                        { label: 'Academic Review', status: 'PENDING_REVIEW', completedStatus: ['OPS_APPROVED', 'FINANCE_PENDING', 'FINANCE_APPROVED', 'ENROLLED'] },
                        { label: 'Finance Clearance', status: 'FINANCE_PENDING', completedStatus: ['FINANCE_APPROVED', 'ENROLLED'] },
                        { label: 'Enrollment', status: 'FINANCE_APPROVED', completedStatus: ['ENROLLED'] }
                      ].map((m, i) => {
                        const isCompleted = selectedStudent ? m.completedStatus.includes(selectedStudent.status) : false;
                        const isActive = selectedStudent ? selectedStudent.status === m.status : false;
                        return (
                          <MilestoneNode 
                            key={i}
                            label={m.label}
                            isActive={isActive}
                            isCompleted={isCompleted}
                          />
                        )
                      })}
                   </>
                )}
             </div>
          </div>

          {/* Onboarding Status Registry */}
          <div className="space-y-6">
             <div className="flex items-center justify-between px-6">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                  <Activity className="w-5 h-5 text-indigo-500" />
                  {activeTab === 'students' ? 'Student Status Registry' : 'Center Registration Registry'}
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-200">
                    <Filter className="w-3 h-3" />
                    <select 
                      className="bg-transparent border-none focus:ring-0 cursor-pointer outline-none"
                      value={filterStage}
                      onChange={(e) => setFilterStage(e.target.value)}
                    >
                      <option value="all">Global View</option>
                      {activeTab === 'students' ? (
                        <>
                          <option value="DRAFT">Application</option>
                          <option value="PENDING_REVIEW">Academic Review</option>
                          <option value="FINANCE_PENDING">Finance Clearance</option>
                          <option value="ENROLLED">Enrolled</option>
                        </>
                      ) : (
                        <>
                          <option value="proposed">Proposed</option>
                          <option value="staged">Finance Pending</option>
                          <option value="active">Active Hub</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
             </div>

              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="cursor-pointer">
                  {activeTab === 'students' ? (
                    <DataTable 
                      data={filteredData}
                      onRowClick={(row: any) => setSelectedStudent(row)}
                      columns={[
                        {
                          accessorKey: 'name',
                          header: 'Student Identity',
                          cell: ({ row }: any) => (
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-all font-black text-[10px]">
                                 {row.original.name?.charAt(0) || '?'}
                              </div>
                              <div className="flex flex-col">
                                <Link
                                  to={`/dashboard/academic/students/${row.original.id}`}
                                  onClick={(event) => event.stopPropagation()}
                                  className="font-bold text-slate-900 text-sm hover:text-blue-600 transition-colors"
                                >
                                  {row.original.name || 'Unknown Student'}
                                </Link>
                                <span className="text-[10px] text-slate-400 uppercase font-black">Partner: {row.original.center?.name || 'Institutional Desk'}</span>
                              </div>
                            </div>
                          )
                        },
                        {
                          accessorKey: 'reviewStage',
                          header: 'Current Desk',
                          cell: ({ row }: any) => (
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
                               {row.original.reviewStage || 'INITIAL'}
                            </span>
                          )
                        },
                        {
                          id: 'roadmap',
                          header: 'Enrollment Roadmap',
                          cell: ({ row }: any) => {
                            const stages = [
                              { status: 'DRAFT', completedStatus: ['PENDING_REVIEW', 'OPS_APPROVED', 'FINANCE_PENDING', 'FINANCE_APPROVED', 'ENROLLED'] },
                              { status: 'PENDING_REVIEW', completedStatus: ['OPS_APPROVED', 'FINANCE_PENDING', 'FINANCE_APPROVED', 'ENROLLED'] },
                              { status: 'FINANCE_PENDING', completedStatus: ['FINANCE_APPROVED', 'ENROLLED'] },
                              { status: 'ENROLLED', completedStatus: ['ENROLLED'] }
                            ];
                            
                            return (
                              <div className="flex items-center gap-1.5">
                                {stages.map((stage, i) => {
                                  const isCompleted = stage.completedStatus.includes(row.original.status);
                                  const isActive = row.original.status === stage.status;
                                  return (
                                    <div 
                                      key={i} 
                                      className={`w-3.5 h-1.5 rounded-full transition-all ${
                                        isCompleted ? 'bg-indigo-600' : isActive ? 'bg-indigo-400 animate-pulse' : 'bg-slate-200'
                                      }`} 
                                      title={stage.status}
                                    />
                                  );
                                })}
                              </div>
                            )
                          }
                        },
                        {
                          accessorKey: 'status',
                          header: 'Status',
                          cell: ({ row }: any) => (
                            <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest inline-block ${
                              row.original.status === 'ENROLLED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                              {row.original.status}
                            </div>
                          )
                        }
                      ]}
                      searchKey="name"
                      searchPlaceholder="Search institutional roadmap..."
                    />
                  ) : (
                    <DataTable 
                      data={filteredCentersData}
                      onRowClick={(row: any) => setSelectedCenter(row)}
                      columns={[
                        {
                          accessorKey: 'name',
                          header: 'Partner Identity',
                          cell: ({ row }: any) => (
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-all font-black text-[10px]">
                                 {row.original.name?.charAt(0) || '?'}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 text-sm">{row.original.name}</span>
                                <span className="text-[10px] text-slate-400 uppercase font-black">{row.original.centerStatus || 'NEW PARTNER'}</span>
                              </div>
                            </div>
                          )
                        },
                        {
                          accessorKey: 'auditStatus',
                          header: 'Academic Audit',
                          cell: ({ row }: any) => (
                            <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest inline-block ${
                              row.original.auditStatus === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                              {row.original.auditStatus}
                            </div>
                          )
                        },
                        {
                          id: 'roadmap',
                          header: 'Registration Roadmap',
                          cell: ({ row }: any) => {
                            const stages = [
                              { label: 'Registration', isCompleted: (['staged', 'active'].includes(row.original.status) || row.original.auditStatus === 'approved'), isActive: (row.original.status === 'proposed' && row.original.auditStatus === 'pending') },
                              { label: 'Academic Audit', isCompleted: row.original.auditStatus === 'approved', isActive: row.original.auditStatus === 'pending' },
                              { label: 'Finance Clearing', isCompleted: row.original.status === 'active', isActive: row.original.status === 'staged' },
                              { label: 'Active Hub', isCompleted: row.original.status === 'active', isActive: row.original.status === 'active' }
                            ];
                            
                            return (
                              <div className="flex items-center gap-1.5">
                                {stages.map((stage, i) => (
                                  <div 
                                    key={i} 
                                    className={`w-3.5 h-1.5 rounded-full transition-all ${
                                      stage.isCompleted ? 'bg-indigo-600' : stage.isActive ? 'bg-indigo-400 animate-pulse' : 'bg-slate-200'
                                    }`} 
                                    title={stage.label}
                                  />
                                ))}
                              </div>
                            )
                          }
                        },
                        {
                          accessorKey: 'status',
                          header: 'Activation Status',
                          cell: ({ row }: any) => (
                            <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest inline-block ${
                              row.original.status === 'active' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'
                            }`}>
                              {row.original.status}
                            </div>
                          )
                        }
                      ]}
                      searchKey="name"
                      searchPlaceholder="Search center registry..."
                    />
                  )}
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
