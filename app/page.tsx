'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function RootPage() {
  const router = useRouter();
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(currentUser ? '/dashboard' : '/login');
  }, [loading, currentUser, router]);

  return null;
}
