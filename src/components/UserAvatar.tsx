'use client';

interface Props {
  /** Foto de perfil de Microsoft 365 (data URI base64) o null si no hay foto. */
  photoUrl?: string | null;
  /** Nombre de display del usuario (usado para extraer la inicial cuando no hay foto). */
  displayName?: string | null;
  /** Email del usuario (fallback si no hay displayName). */
  email?: string;
  /** Tamaño en píxeles del avatar (cuadrado). Default: 40. */
  size?: number;
  /** Si true, muestra un halo radial azul detrás del avatar (estilo brand). Default: true. */
  withHalo?: boolean;
  /** Clase adicional para el contenedor. */
  className?: string;
}

/**
 * Avatar del asesor / usuario humano. Renderiza la foto de perfil de Microsoft 365
 * cuando está disponible, o cae a una inicial mayúscula sobre fondo brand azul.
 *
 * Patrón visual consistente con IAAvatar (halo radial detrás + redondeado).
 */
export function UserAvatar({
  photoUrl,
  displayName,
  email,
  size = 40,
  withHalo = true,
  className = '',
}: Props) {
  const seed = (displayName?.trim() || email?.split('@')[0] || 'A').trim();
  const initial = (seed.charAt(0) || 'A').toUpperCase();

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {withHalo && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(27,58,92,0.5) 0%, rgba(27,58,92,0.15) 50%, transparent 75%)',
            filter: 'blur(6px)',
          }}
        />
      )}

      {photoUrl ? (
        <img
          src={photoUrl}
          alt={displayName || email || 'Avatar'}
          className="relative z-10 rounded-full object-cover shadow-md"
          style={{
            width: size,
            height: size,
            boxShadow: '0 4px 12px rgba(27,58,92,0.35)',
          }}
        />
      ) : (
        <div
          className="relative z-10 rounded-full flex items-center justify-center text-white font-bold shadow-md"
          style={{
            width: size,
            height: size,
            fontSize: Math.round(size * 0.45),
            background: 'linear-gradient(135deg, #1B3A5C 0%, #2a5a8c 100%)',
            boxShadow: '0 4px 12px rgba(27,58,92,0.35)',
          }}
        >
          {initial}
        </div>
      )}
    </div>
  );
}
