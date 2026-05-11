'use client';

import { useEffect, useState, useTransition } from 'react';
import { MetricCard } from './MetricCard';
import { UsageChart } from './UsageChart';
import { QualityDonut } from './QualityDonut';
import { TopAsesoresTable } from './TopAsesoresTable';
import { DownvotesTable } from './DownvotesTable';
import { ConversationsList } from './ConversationsList';

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

interface InitialData {
  kpis: Kpis;
  usage: UsageDay[];
  topAsesores: AsesorRow[];
  downvotes: DownvoteRow[];
  conversations: ConvRow[];
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
    <div className="space-y-6">
      {/* Barra de filtros + refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1 w-fit">
          {(['today', 'week', 'month', 'all'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => changePeriod(p)}
              className={`text-xs px-3 py-1.5 rounded font-medium transition-colors cursor-pointer ${
                period === p
                  ? 'bg-[#1B3A5C] text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {{ today: 'Hoy', week: '7 días', month: '30 días', all: 'Todo' }[p]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <p className="text-xs text-slate-400">
            Última actualización: {lastUpdate.toLocaleTimeString('es-PR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <button
            onClick={refresh}
            disabled={isPending}
            className="text-xs px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={isPending ? 'animate-spin' : ''}>
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            {isPending ? 'Actualizando...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Mensajes"
          value={data.kpis.totalMessages}
          subtitle={periodLabel}
          accent="navy"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          }
        />
        <MetricCard
          label="Asesores activos"
          value={data.kpis.activeUsers}
          subtitle="usuarios únicos"
          accent="orange"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          }
        />
        <MetricCard
          label="Conversaciones"
          value={data.kpis.totalConvs}
          subtitle="iniciadas"
          accent="navy"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
          }
        />
        <MetricCard
          label="Satisfacción"
          value={data.kpis.satisfactionPct !== null ? `${data.kpis.satisfactionPct}%` : '—'}
          subtitle={data.kpis.thumbsUp + data.kpis.thumbsDown > 0 ? `${data.kpis.thumbsUp + data.kpis.thumbsDown} votos` : 'sin votos aún'}
          accent={data.kpis.satisfactionPct === null || data.kpis.satisfactionPct >= 70 ? 'green' : data.kpis.satisfactionPct >= 50 ? 'orange' : 'red'}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
          }
        />
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UsageChart data={data.usage} />
        <QualityDonut thumbsUp={data.kpis.thumbsUp} thumbsDown={data.kpis.thumbsDown} />
      </div>

      {/* Tablas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopAsesoresTable data={data.topAsesores} />
        <DownvotesTable data={data.downvotes} />
      </div>

      {/* Lista de conversaciones recientes (auditoría completa) */}
      <ConversationsList data={data.conversations} />
    </div>
  );
}
