'use client';

import { useAuth } from '@/context/AuthContext';
import Reports from '@/views/Reports';

export default function ReportsPage() {
  const { currentUser } = useAuth();
  return <Reports currentUser={currentUser} />;
}
