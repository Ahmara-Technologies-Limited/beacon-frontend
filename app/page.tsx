'use client';

import { useEffect } from 'react';

import { useAuth } from '@/context/AuthContext';
import { useAppNavigate } from '@/lib/navigation';

export default function RootPage() {
  const router = useAppNavigate();
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(currentUser ? '/dashboard' : '/login');
  }, [loading, currentUser, router]);

  return null;
}
