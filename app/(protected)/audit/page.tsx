'use client';

import { useAuth } from '@/context/AuthContext';
import AuditLogs from '@/views/AuditLogs';

export default function AuditPage() {
  const { currentUser } = useAuth();
  return <AuditLogs currentUser={currentUser} />;
}
