import { AdminChat } from '@/components/admin/AdminChat';

/**
 * /admin/gestion — Chat de gestión con el agente Zoho.
 * La autorización (allowlist por email) la aplica src/app/admin/layout.tsx.
 * Usa el endpoint agéntico /api/chat; como el admin tiene canSeeAll, puede
 * consultar cualquier cartera, asignar leads y agregar notas por lenguaje natural.
 */
export default function AdminGestionPage() {
  return <AdminChat />;
}
