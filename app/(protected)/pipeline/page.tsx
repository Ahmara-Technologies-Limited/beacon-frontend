'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { routeForTab } from '@/lib/routes';
import PipelineTracker from '@/views/PipelineTracker';

export default function PipelinePage() {
  const router = useRouter();
  const { currentUser } = useAuth();

  return (
    <PipelineTracker
      currentUser={currentUser}
      setViewingLeadId={(id: string) => router.push(`/leads/${id}?from=pipeline`)}
      setCurrentTab={(tab: string) => router.push(routeForTab(tab))}
    />
  );
}
