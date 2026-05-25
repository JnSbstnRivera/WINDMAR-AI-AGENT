'use client';

import { useEffect, useState, useTransition } from 'react';
import { MetricCard } from './MetricCard';
import { UsageChart } from './UsageChart';
import { QualityDonut } from './QualityDonut';
import { TopAsesoresTable } from './TopAsesoresTable';
import { DownvotesTable } from './DownvotesTable';
import { ConversationsList } from './ConversationsList';
import { DepartmentChart } from './DepartmentChart';
import { HourlyChart } from './HourlyChart';
// NOTA: TopKeywords y WeekComparison fueron removidos del dashboard por preferencia
// del admin. Los componentes y funciones SQL se conservan en el repo por si se
// quieren reactivar en el futuro — solo hay que volver a importar y montar.

type Period = 'today' | 'week' | 'month' | 'all';

interface Kpis {
  totalMessages: number;
  activeUsers: number;
  totalConvs: number;
  thumbsUp: number;
  thumbsDown: number;
  satisfactionPct: number | null;
}

interface UsageDay {
  day_label: string;
  messages_count: number;
}

interface AsesorRow {
  asesor_email: string;
  display_name: string | null;
  departamento: string | null;
  rol: string | null;
  total_messages: number;
  total_convs: number;
}

interface DownvoteRow {
  feedback_id: string;
  user_email: string;
  display_name: string | null;
  message_excerpt: string;
  reason: string | null;
  created_at: string;
}

interface ConvRow {
  conv_id: string;
  user_email: string;
  display_name: string | null;
  departamento: string | null;
  rol: string | null;
  title: string;
  total_messages: number;
  first_user_message: string | null;
  last_message_at: string;
  created_at: string;
}

interface DeptRow {
  departamento: string;
  total_messages: number;
  active_users: number;
}

interface HourRow {
  hour_pr: number;
  total_messages: number;
}

interface InitialData {
  kpis: Kpis;
  usage: UsageDay[];
  topAsesores: AsesorRow[];
  downvotes: DownvoteRow[];
  conversations: ConvRow[];
  departments: DeptRow[];
  hourly: HourRow[];
}

interface Props {
  initialPeriod: Period;
  initial: InitialData;
}

/**
 * Cliente component que orchesta el dashboard. Permite cambiar período sin
 * recargar la página — re-fetch al endpoint /api/admin/metrics?period=...
 */
export function AdminDashboard({ initialPeriod, initial }: Props) {
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [data, setData] = useState<InitialData>(initial);
  const [isPending, startTransition] = useTransition();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  async function fetchMetrics(p: Period) {
    try {
      const res = await fetch(`/api/admin/metrics?period=${p}`, { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
      setLastUpdate(new Date());
    } catch {
      // silencioso — siguiente refresh lo intenta de nuevo
    }
  }

  function changePeriod(p: Period) {
    setPeriod(p);
    startTransition(() => {
      fetchMetrics(p);
    });
  }

  function refresh() {
    startTransition(() => {
      fetchMetrics(period);
    });
  }

  // Auto-refresh cada 60 segundos (mantiene datos frescos sin saturar DB)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMetrics(period);
    }, 60000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const periodLabel = {
    today: 'Hoy',
    week:  'Esta semana',
    month: 'Este mes',
    all:   'Toda la historia',
  }[period];

  return (
    <div className="space-y-3">
      {/* Toolbar: filtros de periodo estilo tabs neón + indicador live + refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="ad-tabs">
          {(['today', 'week', 'month', 'all'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => changePeriod(p)}
              className={`ad-tab ${period === p ? 'ad-on' : ''}`}
            >
              {{ today: 'Hoy', week: '7 días', month: '30 días', all: 'Todo' }[p]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <span
            className="ad-mono"
            style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.12em' }}
          >
            ACT {lastUpdate.toLocaleTimeString('es-PR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <button
            onClick={refresh}
            disabled={isPending}
            className="ad-mono"
            style={{
              fontSize: 10,
              color: 'var(--text2)',
              padding: '6px 12px',
              borderRadius: 8,
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              cursor: isPending ? 'wait' : 'pointer',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              opacity: isPending ? 0.5 : 1,
            }}
          >
            {isPending ? 'Actualizando…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* KPI grid neón — iconos SVG en color del slot, tooltips al hover.
          key={period} fuerza re-mount al cambiar filtro → re-dispara animaciones */}
      <div key={`kpi-${period}`} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 ad-anim-in">
        <MetricCard
          label="Mensajes"
          value={data.kpis.totalMessages}
          subtitle={periodLabel}
          variant={1}
          tooltip={`Total de mensajes enviados al chat en el periodo: ${periodLabel}`}
          icon={
            // message-square (Lucide)
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          }
        />
        <MetricCard
          label="Asesores activos"
          value={data.kpis.activeUsers}
          subtitle="únicos"
          variant={2}
          tooltip={`Asesores únicos que enviaron al menos 1 mensaje en ${periodLabel}`}
          icon={
            // users (Lucide)
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <MetricCard
          label="Conversaciones"
          value={data.kpis.totalConvs}
          subtitle="iniciadas"
          variant={3}
          tooltip={`Conversaciones iniciadas en ${periodLabel}`}
          icon={
            // activity (Lucide) — pulso de actividad
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          }
        />
        <MetricCard
          label="Satisfacción"
          value={data.kpis.satisfactionPct !== null ? `${data.kpis.satisfactionPct}%` : '—'}
          subtitle={data.kpis.thumbsUp + data.kpis.thumbsDown > 0 ? `${data.kpis.thumbsUp + data.kpis.thumbsDown} votos` : 'sin votos'}
          variant={4}
          tooltip={`👍 ${data.kpis.thumbsUp} útiles · 👎 ${data.kpis.thumbsDown} no útiles · Total ${data.kpis.thumbsUp + data.kpis.thumbsDown}`}
          icon={
            // sparkles / award (Lucide) — calidad
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          }
        />
      </div>

      {/* Gráficas — uso temporal y calidad */}
      <div key={`charts1-${period}`} className="grid grid-cols-1 lg:grid-cols-2 gap-3 ad-anim-in ad-anim-d1">
        <UsageChart data={data.usage} period={period} />
        <QualityDonut thumbsUp={data.kpis.thumbsUp} thumbsDown={data.kpis.thumbsDown} />
      </div>

      {/* Gráficas — uso por departamento y hora pico */}
      <div key={`charts2-${period}`} className="grid grid-cols-1 lg:grid-cols-2 gap-3 ad-anim-in ad-anim-d2">
        <DepartmentChart data={data.departments} />
        <HourlyChart data={data.hourly} />
      </div>

      {/* Tablas: ranking + downvotes */}
      <div key={`tables-${period}`} className="grid grid-cols-1 lg:grid-cols-2 gap-3 ad-anim-in ad-anim-d3">
        <TopAsesoresTable data={data.topAsesores} />
        <DownvotesTable data={data.downvotes} />
      </div>

      {/* Lista de conversaciones recientes (auditoría completa) */}
      <div key={`convs-${period}`} className="ad-anim-in ad-anim-d4">
        <ConversationsList data={data.conversations} />
      </div>
    </div>
  );
}
