import AnnouncementBoard from '@/components/shared/AnnouncementBoard';
import { Megaphone } from 'lucide-react';

export default function CenterAnnouncements() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-black text-slate-900 tracking-tight">Institutional Board</h1>
           <p className="text-slate-500 text-sm font-medium">Review directives and operational updates from the Academic & HR departments.</p>
        </div>
        <div className="bg-blue-50 text-blue-600 p-2 rounded-xl">
            <Megaphone className="w-6 h-6" />
        </div>
      </div>

      <div className="max-w-4xl">
        <AnnouncementBoard />
      </div>
    </div>
  );
}
