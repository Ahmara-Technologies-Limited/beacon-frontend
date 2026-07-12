'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCrmUI } from '@/context/CrmUIContext';
import { routeForTab } from '@/lib/routes';
import LeadProfile from '@/views/LeadProfile';

export default function LeadProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();
  const { openEditLead, openLogActivity, openBookInspection } = useCrmUI();

  const inspectionId = searchParams.get('inspectionId') || null;
  const from = searchParams.get('from');

  const handleBack = () => {
    if (from && from !== 'leads') {
      router.push(routeForTab(from));
    } else {
      router.push('/leads');
    }
  };

  return (
    <LeadProfile
      leadId={params.id}
      inspectionId={inspectionId}
      onBack={handleBack}
      currentUser={currentUser}
      onLogActivityClick={openLogActivity}
      onBookInspectionClick={openBookInspection}
      onEditLeadClick={openEditLead}
    />
  );
}
