import { Routes, Route } from 'react-router-dom';
import DepartmentsList from './DepartmentsList';
import CustomDepartmentManage from './CustomDepartmentManage';
import CEOPanelsList from './CEOPanelsList';
import CEOPanelVisibility from './CEOPanelVisibility';
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
import SystemHealth from './SystemHealth';
import DataManagement from './DataManagement';
import CronMonitoring from './CronMonitoring';
import SurveyCreator from './SurveyCreator';

export default function OrgAdminDashboard() {
  return (
    <Routes>
      <Route path="/" element={<Overview />} />
      <Route path="overview" element={<Overview />} />
      <Route path="alerts" element={<Alerts />} />
      
      {/* Department Routes */}
      <Route path="departments" element={<DepartmentsList />} />
      <Route path="departments/custom" element={<CustomDepartmentManage />} />
      
      {/* CEO Panel Routes */}
      <Route path="ceo-panels" element={<CEOPanelsList />} />
      <Route path="ceo-panels/visibility" element={<CEOPanelVisibility />} />
      
      {/* Permissions */}
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
      
      {/* System Routes */}
      <Route path="system-health" element={<SystemHealth />} />
      <Route path="data" element={<DataManagement />} />
      <Route path="cron" element={<CronMonitoring />} />
      <Route path="surveys" element={<SurveyCreator />} />
    </Routes>
  );
}
