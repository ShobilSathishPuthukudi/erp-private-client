import { Bell } from 'lucide-react';
import AnnouncementBoard from '@/components/shared/AnnouncementBoard';

export default function SharedAnnouncements() {
  return (
    <div className="space-y-8 p-6 lg:p-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-slate-200">
              <Bell className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Institutional board</h1>
          </div>
          <p className="text-slate-500 font-medium max-w-2xl">
            Review organization-wide broadcasts, HR notices, and operational directives available to your role.
          </p>
        </div>
      </div>

      <AnnouncementBoard />
    </div>
  );
}
