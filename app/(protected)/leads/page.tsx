'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCrmUI } from '@/context/CrmUIContext';
import LeadManagement from '@/views/LeadManagement';

export default function LeadsPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { openEditLead, searchTerm } = useCrmUI();

  return (
    <LeadManagement
      currentUser={currentUser}
      onAddLeadClick={() => openEditLead(null)}
      onEditLeadClick={openEditLead}
      setViewingLeadId={(id: string) => router.push(`/leads/${id}?from=leads`)}
      searchTerm={searchTerm}
    />
  );
}
