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
  const dashboardAllowed = !currentUser || isRouteAllowed('/dashboard', currentUser.role);

  useEffect(() => {
    if (!loading && !currentUser) {
      router.replace('/login');
    } else if (currentUser && !allowed && pathname !== '/dashboard' && dashboardAllowed) {
      router.replace('/dashboard');
    }
  }, [loading, currentUser, allowed, dashboardAllowed, pathname, router]);

  const handleSignOut = () => {
    logout();
    router.push('/login');
  };

  if (loading || !currentUser) {
    return null;
  }

  // Don't silently render nothing: if this role isn't allowed anywhere (not
  // even /dashboard), that's a misconfigured/unrecognized role - most likely
  // a backend role value that doesn't match this app's expected role names
  // (e.g. "SUPER_ADMIN" vs "Super Admin"). Say so instead of a blank screen.
  if (!allowed && (pathname === '/dashboard' || !dashboardAllowed)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 12, padding: 24, textAlign: 'center' }}>
        <h2>Access restricted</h2>
        <p>
          Your account&apos;s role (<code>{currentUser.role}</code>) isn&apos;t recognized by any page in this app.
          This usually means the role value on your account doesn&apos;t match one of the expected role names.
        </p>
        <button className="btn btn-primary" onClick={handleSignOut}>Sign out</button>
      </div>
    );
  }

  if (!allowed) {
    return null;
  }

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
