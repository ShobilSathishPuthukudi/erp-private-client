import { Routes, Route, Navigate } from 'react-router-dom';
import DepartmentsList from './DepartmentsList';
import SubDepartmentsList from './SubDepartmentsList';
import CEOPanelsList from './CEOPanelsList';
import Overview from './Overview';
import Alerts from './Alerts';
import PermissionMatrix from './PermissionMatrix';
import PermissionAudit from './PermissionAudit';
import AuditAllActions from './AuditAllActions';
import AuditFilterSearch from './AuditFilterSearch';
import AuditComplianceReport from './AuditComplianceReport';
import SettingsGeneral from './SettingsGeneral';
import SettingsIntegrations from './SettingsIntegrations';
import SettingsCustomFields from './SettingsCustomFields';
import SettingsStorageConfig from './SettingsStorageConfig';
import SettingsGovernance from './SettingsGovernance';
import RolesList from './RolesList';
import SystemHealth from './SystemHealth';
import DataManagement from './DataManagement';
import CronMonitoring from './CronMonitoring';
import SurveyCreator from './SurveyCreator';
import DatabaseTables from './DatabaseTables';

import RoleHierarchyView from './RoleHierarchyView';
import { useAuthStore } from '@/store/authStore';
import OpsDashboard from '../academic/OpsDashboard';

export default function OrgAdminDashboard() {
  const { user } = useAuthStore();
  const role = user?.role?.toLowerCase() || '';
  const isOps = role.includes('operations') || role.includes('academic');

  const OverviewComponent = isOps ? OpsDashboard : Overview;

  return (
    <Routes>
      <Route path="/" element={<OverviewComponent />} />
      <Route path="overview" element={<OverviewComponent />} />

      <Route path="roles/hierarchy" element={<RoleHierarchyView />} />
      <Route path="alerts/escalated" element={<Alerts type="Escalated" />} />
      <Route path="alerts/institutional" element={<Alerts type="System" />} />
      <Route path="alerts" element={<Navigate to="alerts/escalated" replace />} />
      
      {/* Department Routes */}
      <Route path="departments" element={<DepartmentsList />} />
      <Route path="sub-departments" element={<SubDepartmentsList />} />
      
      {/* CEO Panel Routes */}
      <Route path="ceo-panels" element={<CEOPanelsList />} />
      
      {/* Permissions */}
      <Route path="permissions/roles" element={<RolesList />} />
      <Route path="permissions/matrix" element={<PermissionMatrix />} />
      <Route path="permissions/audit" element={<PermissionAudit />} />
      
      {/* Audit System */}
      <Route path="audit/all" element={<AuditAllActions />} />
      <Route path="audit/search" element={<AuditFilterSearch />} />
      <Route path="audit/compliance" element={<AuditComplianceReport />} />
      
      {/* Settings */}
      <Route path="settings/general" element={<SettingsGeneral />} />
      <Route path="settings/integrations" element={<SettingsIntegrations />} />
      <Route path="settings/custom-fields" element={<SettingsCustomFields />} />
      <Route path="settings/storage-config" element={<SettingsStorageConfig />} />
      <Route path="settings/governance" element={<SettingsGovernance />} />
      
      {/* System Routes */}
      <Route path="system-health" element={<SystemHealth />} />
      <Route path="data" element={<DataManagement />} />
      <Route path="cron" element={<CronMonitoring />} />
      <Route path="surveys" element={<SurveyCreator />} />
      <Route path="database/tables" element={<DatabaseTables />} />
      
    </Routes>
  );
}
