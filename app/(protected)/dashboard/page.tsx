'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCrmUI } from '@/context/CrmUIContext';
import { routeForTab } from '@/lib/routes';
import Dashboard from '@/views/Dashboard';

export default function DashboardPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { openEditLead, openLogActivity, openBookInspection } = useCrmUI();

  return (
    <Dashboard
      currentUser={currentUser}
      setCurrentTab={(tab: string) => router.push(routeForTab(tab))}
      setViewingLeadId={(id: string) => router.push(`/leads/${id}?from=dashboard`)}
      onAddLeadClick={() => openEditLead(null)}
      onLogActivityClick={openLogActivity}
      onBookInspectionClick={openBookInspection}
      onEditLeadClick={openEditLead}
    />
  );
}
