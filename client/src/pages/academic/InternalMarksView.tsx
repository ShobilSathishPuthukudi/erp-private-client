import InternalMarksManager from '@/components/shared/InternalMarksManager';

export default function OpsInternalMarksView() {
  return (
    <InternalMarksManager 
      title="Institutional assessment oversight"
      subtitle="Comprehensive view of all internal assessment and practical scores across the institution."
      role="academic"
      readOnly={true}
    />
  );
}
