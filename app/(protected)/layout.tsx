'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { CrmUIProvider } from '@/context/CrmUIContext';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { isRouteAllowed } from '@/lib/routes';

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, logout, loading } = useAuth();

  const allowed = !currentUser || isRouteAllowed(pathname, currentUser.role);

  useEffect(() => {
    if (!loading && !currentUser) {
      router.replace('/login');
    } else if (currentUser && !allowed) {
      router.replace('/dashboard');
    }
  }, [loading, currentUser, allowed, router]);

  if (loading || !currentUser || !allowed) {
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
