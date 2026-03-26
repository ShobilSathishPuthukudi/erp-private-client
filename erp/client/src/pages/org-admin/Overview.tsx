import { useState, useEffect } from 'react';
import { 
  Users, 
  Database, 
  MapPin, 
  GraduationCap, 
  Clock, 
  Activity,
  ArrowRight
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

interface Stats {
  totalDepartments: number;
  totalEmployees: number;
  totalStudyCenters: number;
  totalStudents: number;
  pendingApprovals: number;
  systemHealth: 'Healthy' | 'Degraded' | 'Down';
  lastCheck: string;
}

export default function Overview() {
  const [stats, setStats] = useState<Stats>({
    totalDepartments: 0,
    totalEmployees: 0,
    totalStudyCenters: 0,
    totalStudents: 0,
    pendingApprovals: 0,
    systemHealth: 'Healthy',
    lastCheck: new Date().toLocaleTimeString()
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mocking the auto-calculation logic for now
    // In production, this would be a single API call to /api/org-admin/dashboard/stats
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/org-admin/dashboard/stats');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        
        setStats({
          totalDepartments: data.activeDepts,
          totalEmployees: data.totalEmployees,
          totalStudyCenters: data.studyCenters,
          totalStudents: data.totalStudents,
          pendingApprovals: data.pendingTasks,
          systemHealth: data.systemHealth.memoryUsage > 500 ? 'Degraded' : 'Healthy',
          lastCheck: new Date().toLocaleTimeString()
        });
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Auto-refresh every 60 seconds
    return () => clearInterval(interval);
  }, []);

  const MetricCard = ({ title, value, icon: Icon, color, link }: any) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-all hover:shadow-md">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-lg ${color.bg}`}>
          <Icon className={`w-6 h-6 ${color.text}`} />
        </div>
        {link && (
          <NavLink to={link} className="text-slate-400 hover:text-blue-600 transition-colors">
            <ArrowRight className="w-5 h-5" />
          </NavLink>
        )}
      </div>
      <div>
        <h3 className="text-sm font-medium text-slate-500 mb-1">{title}</h3>
        <p className="text-3xl font-bold text-slate-900">
          {loading ? (
            <span className="inline-block w-16 h-8 bg-slate-100 animate-pulse rounded"></span>
          ) : (
            value.toLocaleString()
          )}
        </p>
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Organizational Overview</h1>
        <p className="text-slate-500">Real-time snapshots of IITS RPS operations and health.</p>
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard 
          title="Total Departments Active" 
          value={stats.totalDepartments} 
          icon={Database} 
          color={{ bg: 'bg-blue-50', text: 'text-blue-600' }}
          link="/dashboard/org-admin/departments"
        />
        <MetricCard 
          title="Total Employees" 
          value={stats.totalEmployees} 
          icon={Users} 
          color={{ bg: 'bg-purple-50', text: 'text-purple-600' }}
          link="/dashboard/hr/employees" // Clicking navigates to HR filtered (as per spec)
        />
        <MetricCard 
          title="Total Study Centers" 
          value={stats.totalStudyCenters} 
          icon={MapPin} 
          color={{ bg: 'bg-orange-50', text: 'text-orange-600' }}
        />
        <MetricCard 
          title="Total Students Enrolled" 
          value={stats.totalStudents} 
          icon={GraduationCap} 
          color={{ bg: 'bg-green-50', text: 'text-green-600' }}
        />
        <MetricCard 
          title="Pending Approvals Count" 
          value={stats.pendingApprovals} 
          icon={Clock} 
          color={{ bg: 'bg-rose-50', text: 'text-rose-600' }}
        />
        
        {/* System Health Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <div className="p-2 rounded-lg bg-slate-50">
              <Activity className="w-6 h-6 text-slate-600" />
            </div>
            <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center ${
              stats.systemHealth === 'Healthy' ? 'bg-green-100 text-green-700' :
              stats.systemHealth === 'Degraded' ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse ${
                stats.systemHealth === 'Healthy' ? 'bg-green-600' :
                stats.systemHealth === 'Degraded' ? 'bg-amber-600' :
                'bg-red-600'
              }`}></div>
              {stats.systemHealth}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-1">System Health Status</h3>
            <p className="text-xs text-slate-400 mt-2 flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              Last checked: {stats.lastCheck}
            </p>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 flex items-start gap-4">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <h4 className="font-semibold text-blue-900">Governance & Configuration Panel</h4>
          <p className="text-sm text-blue-700 mt-1 max-w-3xl">
            As an Organization Admin, this panel is your central hub for structure and governance. 
            Data displayed here is read-only and auto-calculated from live system modules. 
            Use the sidebar to manage departments, permissions, and audit trails.
          </p>
        </div>
      </div>
    </div>
  );
}
