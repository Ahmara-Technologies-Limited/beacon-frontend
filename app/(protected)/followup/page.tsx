'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { routeForTab } from '@/lib/routes';
import FollowUp from '@/views/FollowUp';

export default function FollowUpPage() {
  const router = useRouter();
  const { currentUser } = useAuth();

  return (
    <FollowUp
      currentUser={currentUser}
      setViewingLeadId={(id: string) => router.push(`/leads/${id}?from=followup`)}
      setCurrentTab={(tab: string) => router.push(routeForTab(tab))}
    />
  );
}
