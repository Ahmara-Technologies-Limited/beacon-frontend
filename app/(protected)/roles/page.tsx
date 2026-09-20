'use client';

import { useAuth } from '@/context/AuthContext';
import RoleManagement from '@/views/RoleManagement';

export default function RolesPage() {
  const { currentUser } = useAuth();

  return <RoleManagement currentUser={currentUser} />;
}
