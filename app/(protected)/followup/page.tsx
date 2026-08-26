'use client';


import { useAuth } from '@/context/AuthContext';
import { routeForTab } from '@/lib/routes';
import FollowUp from '@/views/FollowUp';
import { useAppNavigate } from '@/lib/navigation';

export default function FollowUpPage() {
  const router = useAppNavigate();
  const { currentUser } = useAuth();

  return (
    <FollowUp
      currentUser={currentUser}
      setViewingLeadId={(id: string) => router.push(`/leads/${id}?from=followup`)}
      setCurrentTab={(tab: string) => router.push(routeForTab(tab))}
    />
  );
}
