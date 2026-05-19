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

      {/* KPI grid neón */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <MetricCard
          label="Mensajes"
          value={data.kpis.totalMessages}
          subtitle={periodLabel}
          variant={1}
          icon="💬"
        />
        <MetricCard
          label="Asesores activos"
          value={data.kpis.activeUsers}
          subtitle="únicos"
          variant={2}
          icon="👥"
        />
        <MetricCard
          label="Conversaciones"
          value={data.kpis.totalConvs}
          subtitle="iniciadas"
          variant={3}
          icon="⚡"
        />
        <MetricCard
          label="Satisfacción"
          value={data.kpis.satisfactionPct !== null ? `${data.kpis.satisfactionPct}%` : '—'}
          subtitle={data.kpis.thumbsUp + data.kpis.thumbsDown > 0 ? `${data.kpis.thumbsUp + data.kpis.thumbsDown} votos` : 'sin votos'}
          variant={4}
          icon="⭐"
        />
      </div>

      {/* Gráficas — uso temporal y calidad */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <UsageChart data={data.usage} />
        <QualityDonut thumbsUp={data.kpis.thumbsUp} thumbsDown={data.kpis.thumbsDown} />
      </div>

      {/* Gráficas — uso por departamento y hora pico */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <DepartmentChart data={data.departments} />
        <HourlyChart data={data.hourly} />
      </div>

      {/* Tablas: ranking + downvotes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <TopAsesoresTable data={data.topAsesores} />
        <DownvotesTable data={data.downvotes} />
      </div>

      {/* Lista de conversaciones recientes (auditoría completa) */}
      <ConversationsList data={data.conversations} />
    </div>
  );
}
