import InternalMarksManager from '@/components/shared/InternalMarksManager';

export default function InternalMarks() {
  return (
    <div className="p-2 h-full">
      <InternalMarksManager 
        title="Internal marks management"
        subtitle="Record internal assessment and practical scores for active batches"
        role="partner-center"
      />
    </div>
  );
}
