import { auth, signOut } from '@/auth';
import { ChatApp } from '@/components/ChatApp';

export default async function HomePage() {
  const session = await auth();
  // Middleware ya redirigió si no hay sesión, pero lo validamos defensivamente
  if (!session?.user?.email) {
    return null;
  }

  const sessionUser = session.user as unknown as Record<string, string | null | undefined>;

  const userData = {
    email: session.user.email,
    displayName: sessionUser.displayName ?? null,
    departamento: sessionUser.departamento ?? null,
    rol: sessionUser.rol ?? 'Asesor',
  };

  async function handleSignOut() {
    'use server';
    await signOut({ redirectTo: '/login' });
  }

  return <ChatApp user={userData} onSignOut={handleSignOut} />;
}
