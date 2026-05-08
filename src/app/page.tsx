import { auth, signOut } from '@/auth';
import { ChatApp } from '@/components/ChatApp';
import { OnboardingGate } from '@/components/OnboardingGate';
import { getSupabaseAdmin } from '@/lib/supabase';

export default async function HomePage() {
  const session = await auth();
  // Middleware ya redirigió si no hay sesión, pero lo validamos defensivamente
  if (!session?.user?.email) {
    return null;
  }

  const sessionUser = session.user as unknown as Record<string, string | null | undefined>;
  const email = session.user.email;

  // Foto de perfil leída server-side (NO en el JWT — sería demasiado grande).
  // Se lee aquí en cada render, lo que es eficiente porque page.tsx ya es Server Component.
  let photoUrl: string | null = null;
  try {
    const { data } = await getSupabaseAdmin()
      .from('user_roles')
      .select('photo_url')
      .eq('user_email', email.toLowerCase())
      .single();
    photoUrl = data?.photo_url ?? null;
  } catch {
    photoUrl = null;
  }

  const userData = {
    email,
    displayName: sessionUser.displayName ?? null,
    departamento: sessionUser.departamento ?? null,
    rol: sessionUser.rol ?? 'Asesor',
    onboardedAt: sessionUser.onboardedAt ?? null,
    // Foto de perfil de Microsoft 365 (data URI base64) — null si el usuario no tiene foto.
    photoUrl,
    // Nombre completo de Microsoft (para mostrar como referencia en onboarding modal)
    microsoftFullName: session.user.name ?? '',
  };

  // Saludo según hora local Puerto Rico (UTC-4)
  const greeting = (() => {
    const hourPR = (new Date().getUTCHours() - 4 + 24) % 24;
    if (hourPR < 12) return 'Buenos días';
    if (hourPR < 18) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  async function handleSignOut() {
    'use server';
    await signOut({ redirectTo: '/login' });
  }

  // Si el asesor no ha completado onboarding (primera vez), mostrar OnboardingGate
  // que renderiza el modal de bienvenida + el chat detrás (bloqueado).
  return (
    <OnboardingGate
      needsOnboarding={!userData.onboardedAt}
      initialDisplayName={userData.displayName ?? 'Asesor'}
      microsoftFullName={userData.microsoftFullName}
      email={userData.email}
      greeting={greeting}
    >
      <ChatApp user={userData} onSignOut={handleSignOut} />
    </OnboardingGate>
  );
}
