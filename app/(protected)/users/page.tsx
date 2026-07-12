'use client';

import { useAuth } from '@/context/AuthContext';
import UserManagement from '@/views/UserManagement';

export default function UsersPage() {
  const { currentUser } = useAuth();
  return <UserManagement currentUser={currentUser} />;
}
