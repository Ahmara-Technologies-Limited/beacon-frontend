'use client';

import { useAuth } from '@/context/AuthContext';
import PropertyManagement from '@/views/PropertyManagement';

export default function PropertiesPage() {
  const { currentUser } = useAuth();
  return <PropertyManagement currentUser={currentUser} />;
}
