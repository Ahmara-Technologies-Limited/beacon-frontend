'use client';


import { useAuth } from '@/context/AuthContext';
import { routeForTab } from '@/lib/routes';
import PipelineTracker from '@/views/PipelineTracker';
import { useAppNavigate } from '@/lib/navigation';

export default function PipelinePage() {
  const router = useAppNavigate();
  const { currentUser } = useAuth();

  return (
    <PipelineTracker
      currentUser={currentUser}
      setViewingLeadId={(id: string) => router.push(`/leads/${id}?from=pipeline`)}
      setCurrentTab={(tab: string) => router.push(routeForTab(tab))}
    />
  );
}
