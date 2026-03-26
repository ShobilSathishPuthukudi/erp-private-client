import { Routes, Route } from 'react-router-dom';
import CRM from './CRM';
import SalesPerformance from './SalesPerformance';
import SalesAchievement from './SalesAchievement';

export default function SalesDashboard() {
  return (
    <Routes>
      <Route path="/" element={
        <div className="space-y-6">
          <SalesAchievement />
          <SalesPerformance />
        </div>
      } />
      <Route path="crm" element={<CRM />} />
    </Routes>
  );
}
