import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { useState, useEffect } from 'react';
import CaregiverPortal from './screens/CaregiverPortal';
import CaregiverDashboard from './screens/CaregiverDashboard';
import Onboarding from './screens/Onboarding';
import DevModeWidget from './components/DevModeWidget';

export default function App() {
  const [role, setRole] = useState<string | null>(localStorage.getItem('userRole'));

  // If URL contains ?caregiver=true, show CaregiverPortal directly
  const params = new URLSearchParams(window.location.search);
  const isCaregiverModeFromUrl = params.get('caregiver') === 'true' && params.get('patient');

  if (isCaregiverModeFromUrl) {
    return (
      <>
        <CaregiverPortal />
        <DevModeWidget />
      </>
    );
  }

  if (!role) {
    return (
      <>
        <Onboarding onComplete={() => setRole(localStorage.getItem('userRole'))} />
        <DevModeWidget />
      </>
    );
  }

  if (role === 'caregiver') {
    return (
      <>
        <CaregiverDashboard />
        <Toaster />
        <DevModeWidget />
      </>
    );
  }

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
      <DevModeWidget />
    </>
  );
}
