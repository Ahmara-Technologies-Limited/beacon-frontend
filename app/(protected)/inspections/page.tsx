'use client';


import { useAuth } from '@/context/AuthContext';
import { useCrmUI } from '@/context/CrmUIContext';
import { routeForTab } from '@/lib/routes';
import Inspections from '@/views/Inspections';
import { useAppNavigate } from '@/lib/navigation';

export default function InspectionsPage() {
  const router = useAppNavigate();
  const { currentUser } = useAuth();
  const { openBookInspection, createdInspection } = useCrmUI();

  return (
    <Inspections
      currentUser={currentUser}
      onBookInspectionClick={() => openBookInspection(null)}
      onEditInspectionClick={(leadId: string, inspId: string) => openBookInspection(leadId, inspId)}
      setViewingLeadId={(id: string, inspId?: string) =>
        router.push(`/leads/${id}?from=inspections${inspId ? `&inspectionId=${inspId}` : ''}`)
      }
      setCurrentTab={(tab: string) => router.push(routeForTab(tab))}
      createdInspection={createdInspection}
    />
  );
}
