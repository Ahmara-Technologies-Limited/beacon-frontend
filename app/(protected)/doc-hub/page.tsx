'use client';

import { useAuth } from '@/context/AuthContext';
import DocOfficerHub from '@/views/DocOfficerHub';

export default function DocHubPage() {
  const { currentUser } = useAuth();
  return <DocOfficerHub currentUser={currentUser} />;
}
