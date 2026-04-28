// MascotPanel — versión simplificada con SUN BOT
// Estática, con brillo de fondo, sin label, una sola imagen

export type MascotState = 'greeting' | 'thinking' | 'pointing' | 'love';

interface Props {
  state?: MascotState; // mantenido por compatibilidad — no se usa
  sidebarHidden?: boolean;
}

export function MascotPanel({ state: _state, sidebarHidden = false }: Props) {
  // Cuando el sidebar está oculto, mascota se mueve a la izquierda total
  const desktopLeft = sidebarHidden ? 'left-4' : 'left-[300px]';

  return (
    <>
      {/* Desktop: bottom-left, después del sidebar (o al borde si está oculto) */}
      <div className={`hidden md:flex fixed ${desktopLeft} bottom-16 z-30 items-center justify-center transition-all duration-300`}>
        <div className="relative flex items-center justify-center" style={{ width: 110, height: 110 }}>
          {/* Brillo de fondo (glow estático con halo) */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(247,148,29,0.45) 0%, rgba(247,148,29,0.15) 50%, transparent 75%)',
              filter: 'blur(12px)',
            }}
          />
          {/* Halo brillante adicional */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 60%)',
            }}
          />
          {/* La mascota */}
          <img
            src="/sunbot.png"
            alt="Windmar Sun Bot"
            className="mascot-img relative z-10 w-24 h-24 object-contain drop-shadow-xl"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
      </div>

      {/* Mobile: bottom-left arriba del input */}
      <div className="md:hidden fixed bottom-16 left-2 z-30">
        <div className="relative" style={{ width: 64, height: 64 }}>
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(247,148,29,0.45) 0%, rgba(247,148,29,0.15) 50%, transparent 75%)',
              filter: 'blur(8px)',
            }}
          />
          <img
            src="/sunbot.png"
            alt="Windmar Sun Bot"
            className="mascot-img relative z-10 w-14 h-14 object-contain drop-shadow-lg"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
      </div>
    </>
  );
}
