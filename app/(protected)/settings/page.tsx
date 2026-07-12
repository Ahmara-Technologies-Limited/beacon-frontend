'use client';

import { useAuth } from '@/context/AuthContext';
import Settings from '@/views/Settings';

export default function SettingsPage() {
  const { currentUser, updateCurrentUser } = useAuth();
  return <Settings currentUser={currentUser} onUserChange={updateCurrentUser} />;
}
