'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import LeadModal from '../components/LeadModal';
import LogActivityModal from '../components/LogActivityModal';
import InspectionModal from '../components/InspectionModal';

// Shape is whatever dataService hands back for a lead; the leads table only
// reads the fields it filters on.
interface CreatedLead {
  id: string;
  [key: string]: unknown;
}

interface CrmUIContextValue {
  darkMode: boolean;
  toggleDarkMode: () => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  openEditLead: (id?: string | null) => void;
  openLogActivity: (leadId: string) => void;
  openBookInspection: (leadId?: string | null, inspId?: string | null) => void;
  handleSaveAndRedirectToLogActivity: (leadId: string) => void;
  createdLead: CreatedLead | null;
  createdInspection: CreatedLead | null;
}

const CrmUIContext = createContext<CrmUIContextValue | null>(null);

export function CrmUIProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('beacon_dark_mode') === 'true';
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadModalId, setLeadModalId] = useState<string | null>(null);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityLeadId, setActivityLeadId] = useState<string | null>(null);
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);
  const [inspectionLeadId, setInspectionLeadId] = useState<string | null>(null);
  const [inspectionId, setInspectionId] = useState<string | null>(null);

  // The records the user just created, if any. These modals are mounted here,
  // globally, so this is the only place that knows a create happened; the
  // matching table reads it to make sure the new row is actually on screen.
  const [createdLead, setCreatedLead] = useState<CreatedLead | null>(null);
  const [createdInspection, setCreatedInspection] = useState<CreatedLead | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('beacon_dark_mode', String(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((d) => !d);

  const openEditLead = (id: string | null = null) => { setLeadModalId(id); setLeadModalOpen(true); };
  const openLogActivity = (leadId: string) => { setActivityLeadId(leadId); setActivityModalOpen(true); };
  const openBookInspection = (leadId: string | null = null, inspId: string | null = null) => {
    setInspectionLeadId(leadId);
    setInspectionId(inspId);
    setInspectionModalOpen(true);
  };
  const handleSaveAndRedirectToLogActivity = (leadId: string) => {
    setLeadModalOpen(false);
    setTimeout(() => openLogActivity(leadId), 200);
  };

  return (
    <CrmUIContext.Provider
      value={{
        darkMode,
        toggleDarkMode,
        mobileSidebarOpen,
        setMobileSidebarOpen,
        searchTerm,
        setSearchTerm,
        openEditLead,
        openLogActivity,
        openBookInspection,
        handleSaveAndRedirectToLogActivity,
        createdLead,
        createdInspection,
      }}
    >
      {children}

      <LeadModal
        isOpen={leadModalOpen}
        leadId={leadModalId}
        onClose={() => setLeadModalOpen(false)}
        currentUser={currentUser}
        onSaveComplete={(savedLead: CreatedLead | undefined, isNew: boolean) => {
          setLeadModalOpen(false);
          if (!isNew || !savedLead) return;
          // A lead the user can't see is the same as no confirmation at all.
          // The header search is app-wide and survives the modal, so someone
          // who searched for a lead, didn't find it and created it would
          // otherwise land back on a table still filtered to that search -
          // i.e. empty. Clear it, and let the leads table relax any of its
          // own filters that would hide the new row.
          setSearchTerm('');
          setCreatedLead(savedLead);
        }}
        onSaveAndLogActivity={handleSaveAndRedirectToLogActivity}
      />
      <LogActivityModal
        isOpen={activityModalOpen}
        leadId={activityLeadId}
        onClose={() => setActivityModalOpen(false)}
        currentUser={currentUser}
        onSaveComplete={() => setActivityModalOpen(false)}
      />
      <InspectionModal
        isOpen={inspectionModalOpen}
        leadId={inspectionLeadId}
        inspectionId={inspectionId}
        onClose={() => setInspectionModalOpen(false)}
        currentUser={currentUser}
        onSaveComplete={(savedInspection: CreatedLead | undefined, isNew: boolean) => {
          setInspectionModalOpen(false);
          if (isNew && savedInspection) setCreatedInspection(savedInspection);
        }}
      />
    </CrmUIContext.Provider>
  );
}

export function useCrmUI() {
  const ctx = useContext(CrmUIContext);
  if (!ctx) throw new Error('useCrmUI must be used within CrmUIProvider');
  return ctx;
}
