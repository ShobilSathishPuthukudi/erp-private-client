import AnnouncementBoard from '@/components/shared/AnnouncementBoard';
import { PageHeader } from '@/components/shared/PageHeader';
import { Megaphone } from 'lucide-react';

export default function CenterAnnouncements() {
  return (
    <div className="p-2 space-y-6">
      <PageHeader 
        title="Institutional board"
        description="Review center directives and operational updates relevant to your institution."
        icon={Megaphone}
      />

      <div className="max-w-4xl">
        <AnnouncementBoard />
      </div>
    </div>
  );
}
