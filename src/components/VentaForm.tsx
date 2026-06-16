'use client';

import { useEffect, useState } from 'react';

// Catálogos espejo de NOTAS-VENTAS-VASS (producto/sub-producto/financiera).
const PRODUCTOS = [
  { v: 'placas', l: 'Placas solares' },
  { v: 'placas_bateria', l: 'Placas + batería' },
  { v: 'powerwall', l: 'Batería Powerwall' },
  { v: 'water', l: 'Water' },
  { v: 'roofing', l: 'Roofing' },
  { v: 'anker', l: 'Anker' },
];
const SUBPRODUCTOS: Record<string, { v: string; l: string }[]> = {
  roofing: [{ v: 'silver', l: 'Silver' }, { v: 'gold', l: 'Gold' }, { v: 'platinum', l: 'Platinum' }],
  powerwall: [{ v: 'pw2', l: 'Powerwall 2' }, { v: 'pw3', l: 'Powerwall 3' }],
  anker: [
    { v: 'anker_2600', l: 'Anker 2600' }, { v: 'anker_3800', l: 'Anker 3800' },
    { v: 'panel_400w', l: 'Panel 400W' }, { v: 'panel_200w', l: 'Panel 200W' },
    { v: 'transfer_manual', l: 'Transfer manual' }, { v: 'transfer_auto', l: 'Transfer automático' },
  ],
  water: [
    { v: 'cisterna_500', l: 'Cisterna 500GL' }, { v: 'cisterna_600', l: 'Cisterna 600GL' },
    { v: 'calentador_1', l: 'Calentador 1 placa' }, { v: 'calentador_2', l: 'Calentador 2 placas' },
    { v: 'calentador_3', l: 'Calentador 3 placas' }, { v: 'calentador_4', l: 'Calentador 4 placas' },
    { v: 'suavisador', l: 'Suavizador POE' }, { v: 'reverse_osmosis', l: 'Reverse Osmosis' },
  ],
};
const FINANCIERAS = [
  { v: 'WH Financial', l: 'WH Financial' }, { v: 'Oriental', l: 'Oriental' },
  { v: 'EnFin', l: 'EnFin' }, { v: 'Palmetto/LightReach', l: 'Palmetto/LightReach' },
  { v: 'Synchrony', l: 'Synchrony' }, { v: 'Kiwi', l: 'Kiwi' },
  { v: 'Tarjeta Home Depot', l: 'Home Depot' }, { v: 'Cash/Contado', l: 'Cash' },
];

const plbl = (v: string) => PRODUCTOS.find((p) => p.v === v)?.l || v;
const slbl = (prod: string, s: string) => SUBPRODUCTOS[prod]?.find((o) => o.v === s)?.l || s;

const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      fontSize: 12, padding: '4px 11px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap',
      border: `1px solid ${on ? '#F7941D' : 'rgba(255,255,255,0.18)'}`,
      background: on ? '#F7941D' : 'transparent', color: on ? '#1B3A5C' : '#cbd5e1', fontWeight: on ? 700 : 400,
    }}
  >
    {children}
  </button>
);

/**
 * Formulario de VENTA (modelo NOTAS-VENTAS-VASS): selectores de producto,
 * sub-productos, financiamiento, consultor, # aplicación y observaciones.
 * Compone una nota estructurada y la sube al `nota` del padre (preview editable).
 */
export function VentaForm({
  consultorPrefill,
  onNote,
}: {
  consultorPrefill?: string | null;
  onNote: (texto: string) => void;
}) {
  const [productos, setProductos] = useState<string[]>([]);
  const [subs, setSubs] = useState<Record<string, string[]>>({});
  const [nPlacas, setNPlacas] = useState('');
  const [nBaterias, setNBaterias] = useState('');
  const [fin, setFin] = useState<string[]>([]);
  const [consultor, setConsultor] = useState(consultorPrefill || '');
  const [aplicacion, setAplicacion] = useState('');
  const [obs, setObs] = useState('');

  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const toggleProducto = (v: string) => setProductos((p) => toggle(p, v));
  const toggleSub = (prod: string, v: string) => setSubs((s) => ({ ...s, [prod]: toggle(s[prod] || [], v) }));
  const toggleFin = (v: string) => setFin((f) => toggle(f, v));

  // Compone la nota y la sube al padre cada vez que cambia algo.
  useEffect(() => {
    const lines: string[] = ['🎉 VENTA CERRADA'];
    if (consultor.trim()) lines.push(`Consultor: ${consultor.trim()}`);
    if (productos.length === 0) lines.push('Producto: —');
    else {
      productos.forEach((prod) => {
        const sub = (subs[prod] || []).map((s) => slbl(prod, s));
        let line = `• ${plbl(prod)}`;
        if (sub.length) line += ` — ${sub.join(' · ')}`;
        if ((prod === 'placas' || prod === 'placas_bateria') && nPlacas) line += ` · ${nPlacas} placas`;
        if (prod === 'placas_bateria' && nBaterias) line += ` · ${nBaterias} baterías`;
        lines.push(line);
      });
    }
    if (fin.length) lines.push(`Financiamiento: ${fin.join(' · ')}`);
    if (aplicacion.trim()) lines.push(`# Aplicación: ${aplicacion.trim()}`);
    if (obs.trim()) lines.push(`Obs: ${obs.trim()}`);
    onNote(lines.join('\n'));
    // onNote es estable (setState del padre); no lo incluimos para evitar loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productos, subs, nPlacas, nBaterias, fin, consultor, aplicacion, obs]);

  const label: React.CSSProperties = { fontSize: 11, color: '#F7941D', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 };
  const inp: React.CSSProperties = { padding: '6px 9px', borderRadius: 8, fontSize: 13, background: '#13243b', color: '#e8eaf0', border: '1px solid rgba(255,255,255,0.15)', outline: 'none' };

  return (
    <div className="flex flex-col gap-3" style={{ marginTop: 2 }}>
      <div>
        <div style={label}>Producto(s)</div>
        <div className="flex flex-wrap gap-1.5">
          {PRODUCTOS.map((p) => <Chip key={p.v} on={productos.includes(p.v)} onClick={() => toggleProducto(p.v)}>{p.l}</Chip>)}
        </div>
      </div>

      {productos.map((prod) =>
        SUBPRODUCTOS[prod] ? (
          <div key={prod}>
            <div style={label}>{plbl(prod)} — detalle</div>
            <div className="flex flex-wrap gap-1.5">
              {SUBPRODUCTOS[prod].map((s) => <Chip key={s.v} on={(subs[prod] || []).includes(s.v)} onClick={() => toggleSub(prod, s.v)}>{s.l}</Chip>)}
            </div>
          </div>
        ) : null
      )}

      {(productos.includes('placas') || productos.includes('placas_bateria')) && (
        <div className="flex gap-2 flex-wrap">
          <div>
            <div style={label}>Placas</div>
            <input type="number" min="0" value={nPlacas} onChange={(e) => setNPlacas(e.target.value)} placeholder="#" style={{ ...inp, width: 90 }} />
          </div>
          {productos.includes('placas_bateria') && (
            <div>
              <div style={label}>Baterías</div>
              <input type="number" min="0" value={nBaterias} onChange={(e) => setNBaterias(e.target.value)} placeholder="#" style={{ ...inp, width: 90 }} />
            </div>
          )}
        </div>
      )}

      <div>
        <div style={label}>Financiamiento / pago</div>
        <div className="flex flex-wrap gap-1.5">
          {FINANCIERAS.map((f) => <Chip key={f.v} on={fin.includes(f.v)} onClick={() => toggleFin(f.v)}>{f.l}</Chip>)}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="flex-1" style={{ minWidth: 160 }}>
          <div style={label}>Consultor</div>
          <input value={consultor} onChange={(e) => setConsultor(e.target.value)} placeholder="Nombre del consultor" style={{ ...inp, width: '100%' }} />
        </div>
        <div style={{ minWidth: 120 }}>
          <div style={label}># Aplicación</div>
          <input value={aplicacion} onChange={(e) => setAplicacion(e.target.value)} placeholder="opcional" style={{ ...inp, width: '100%' }} />
        </div>
      </div>

      <div>
        <div style={label}>Observaciones</div>
        <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} placeholder="Detalle de la venta (opcional)" style={{ ...inp, width: '100%', resize: 'vertical', background: 'rgba(255,255,255,0.05)' }} />
      </div>
    </div>
  );
}
