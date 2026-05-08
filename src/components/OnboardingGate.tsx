'use client';

import { useState } from 'react';
import { OnboardingModal } from './OnboardingModal';

interface Props {
  needsOnboarding: boolean;
  initialDisplayName: string;
  microsoftFullName: string;
  email: string;
  greeting: string;
  children: React.ReactNode;
}

/**
 * Renderiza children (el chat) detrás. Si needsOnboarding es true,
 * superpone el OnboardingModal — el chat queda bloqueado hasta que se complete.
 */
export function OnboardingGate({
  needsOnboarding,
  initialDisplayName,
  microsoftFullName,
  email,
  greeting,
  children,
}: Props) {
  const [showOnboarding, setShowOnboarding] = useState(needsOnboarding);

  return (
    <>
      {children}
      {showOnboarding && (
        <OnboardingModal
          initialDisplayName={initialDisplayName}
          microsoftFullName={microsoftFullName}
          email={email}
          greeting={greeting}
          onComplete={() => {
            setShowOnboarding(false);
            // Forzar reload para que el server component re-lea la sesión
            // con onboardedAt actualizado y datos personalizados
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
