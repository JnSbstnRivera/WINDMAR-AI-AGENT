interface Props {
  label: string;
  value: string | number | null;
  subtitle?: string;
  /** Variante de neón de la línea superior + glow. k1=violeta, k2=cyan, k3=verde, k4=rojo */
  variant?: 1 | 2 | 3 | 4;
  /** Emoji o glyph mostrado en el cuadro de icono. */
  icon?: React.ReactNode;
  /** Delta % vs período anterior (positivo o negativo). null = sin badge. */
  deltaPct?: number | null;
  /** Texto tooltip al hacer hover en la card. */
  tooltip?: string;
}

/**
 * KPI card estilo Executive Dashboard.
 *
 * Estructura visual:
 *   ┌──────────────────────┐ ← línea neón superior (variant)
 *   │ [icon]               │
 *   │ LABEL                │
 *   │ NÚMERO grande        │
 *   │ ↑ delta%             │
 *   └──────────────────────┘
 *
 * `variant` controla el color del neon top line, icon glow y radial glow on-hover.
 */
export function MetricCard({ label, value, subtitle, variant = 1, icon, deltaPct, tooltip }: Props) {
  const display = value === null || value === undefined ? '—' : value;

  const deltaClass =
    deltaPct === null || deltaPct === undefined
      ? null
      : deltaPct >= 0
        ? 'ad-up'
        : 'ad-dn';
  const deltaText =
    deltaPct === null || deltaPct === undefined
      ? null
      : `${deltaPct >= 0 ? '↑' : '↓'} ${Math.abs(Math.round(deltaPct))}%`;

  return (
    <div className={`ad-card ad-kpi ad-k${variant}`} title={tooltip ?? label}>
      <div className="ad-kpi-glow" />
      {icon && <div className="ad-kpi-icon">{icon}</div>}
      <div className="ad-kpi-lbl">{label}</div>
      <div className="ad-kpi-num tabular-nums">{display}</div>
      <div className="ad-kpi-bottom">
        {deltaText ? (
          <span className={`ad-kpi-delta ${deltaClass}`}>{deltaText}</span>
        ) : subtitle ? (
          <span className="ad-mono text-[9px] tracking-[0.12em]" style={{ color: 'var(--text3)' }}>
            {subtitle.toUpperCase()}
          </span>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
