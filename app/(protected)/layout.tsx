'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { CrmUIProvider } from '@/context/CrmUIContext';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const { currentUser, logout, loading } = useAuth();

  useEffect(() => {
    if (!loading && !currentUser) {
      router.replace('/login');
    }
  }, [loading, currentUser, router]);

  if (loading || !currentUser) {
    return null;
  }

  const handleSignOut = () => {
    logout();
    router.push('/login');
  };

  return (
    <CrmUIProvider>
      <div className="app-container">
        <Sidebar currentUser={currentUser} onSignOut={handleSignOut} />
        <div className="main-content">
          <Header />
          <main className="page-wrapper">{children}</main>
        </div>
      </div>
    </CrmUIProvider>
  );
}
