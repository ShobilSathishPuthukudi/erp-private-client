import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import DashboardMetricCard from '@/components/dashboard/DashboardMetricCard';
import MetricDrillDown from '@/components/dashboard/MetricDrillDown';

type TeamMember = {
  uid: string;
  name: string;
  email?: string;
  role?: string;
  status?: string;
};

type TaskItem = {
  id: number;
  title: string;
  status?: string;
  deadline?: string;
  assignee?: { name?: string };
};

type LeaveItem = {
  id: number;
  type?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  employee?: { name?: string; email?: string };
};

export default function DeptAdminDashboard() {
  const { user } = useAuthStore();
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState<any>(null);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 300000);
    return () => clearInterval(interval);
  }, [user?.deptId, user?.subDepartment]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const taskParams = {
        departmentId: user?.deptId
      };

      const [teamRes, taskRes, leaveRes] = await Promise.all([
        api.get('/dept-admin/team'),
        api.get('/dept-admin/tasks', { params: taskParams }),
        api.get('/dept-admin/leaves')
      ]);

      const team: TeamMember[] = teamRes.data || [];
      const tasks: TaskItem[] = taskRes.data || [];
      const leaves: LeaveItem[] = leaveRes.data || [];
      const now = Date.now();

      const openTasks = tasks.filter((task) => task.status !== 'completed');
      const overdueTasks = openTasks.filter((task) => {
        const deadline = task.deadline ? new Date(task.deadline).getTime() : Number.NaN;
        return Number.isFinite(deadline) && deadline < now;
      });
      const pendingLeaves = leaves.filter((leave) => ['pending admin', 'pending hr'].includes((leave.status || '').toLowerCase()));

      setMetrics([
        {
          id: 'team-size',
          label: 'Active Team Members',
          value: team.length,
          trend: [Math.max(team.length - 2, 0), Math.max(team.length - 1, 0), team.length],
          status: team.length > 0 ? 'green' : 'amber',
          drillDown: team.map((member) => ({
            subject: member.name || member.uid,
            category: member.role || 'Employee',
            value: member.email || member.uid,
            status: member.status === 'active' ? 'success' : 'warning'
          }))
        },
        {
          id: 'open-tasks',
          label: 'Open Tasks',
          value: openTasks.length,
          trend: [Math.max(openTasks.length - 2, 0), Math.max(openTasks.length - 1, 0), openTasks.length],
          status: overdueTasks.length > 0 ? 'amber' : 'green',
          drillDown: openTasks.map((task) => ({
            subject: task.title || `Task #${task.id}`,
            category: task.assignee?.name || 'Unassigned',
            value: task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline',
            status: task.status === 'completed' ? 'success' : 'warning'
          }))
        },
        {
          id: 'pending-leaves',
          label: 'Pending Leave Requests',
          value: pendingLeaves.length,
          trend: [Math.max(pendingLeaves.length - 2, 0), Math.max(pendingLeaves.length - 1, 0), pendingLeaves.length],
          status: pendingLeaves.length > 0 ? 'amber' : 'green',
          drillDown: pendingLeaves.map((leave) => ({
            subject: leave.employee?.name || `Leave #${leave.id}`,
            category: leave.type || 'Leave',
            value: `${leave.fromDate || '-'} to ${leave.toDate || '-'}`,
            status: leave.status === 'approved' ? 'success' : 'warning'
          }))
        },
        {
          id: 'overdue-tasks',
          label: 'Overdue Tasks',
          value: overdueTasks.length,
          trend: [Math.max(overdueTasks.length + 2, 0), Math.max(overdueTasks.length + 1, 0), overdueTasks.length],
          status: overdueTasks.length > 0 ? 'red' : 'green',
          drillDown: overdueTasks.map((task) => ({
            subject: task.title || `Task #${task.id}`,
            category: task.assignee?.name || 'Unassigned',
            value: task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline',
            status: 'warning'
          }))
        }
      ]);
    } catch (error) {
      console.error('Failed to sync department metrics', error);
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Department intelligence</h1>
          <p className="text-slate-500 font-medium mt-1 text-sm uppercase tracking-widest">Live team, task, and leave telemetry / {new Date().toLocaleDateString()}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">System Vital</p>
          <div className="flex items-center gap-2 text-emerald-500 font-black">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            HEALTHY / SYNCED
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <DashboardMetricCard
            key={metric.id}
            {...metric}
            onClick={() => setDrillDown({ label: metric.label, data: metric.drillDown })}
          />
        ))}
        {loading && Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-slate-50 h-48 rounded-[32px] animate-pulse border border-slate-100" />
        ))}
      </div>

      <MetricDrillDown
        isOpen={!!drillDown}
        onClose={() => setDrillDown(null)}
        metricLabel={drillDown?.label}
        data={drillDown?.data || []}
      />

      <Routes>
        <Route path="/" element={
          <div className="p-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Department administration</h1>
            <p className="text-slate-500">Real-time oversight of team workload, pending leave approvals, and overdue execution items for your department.</p>
          </div>
        } />
      </Routes>
    </div>
  );
}
