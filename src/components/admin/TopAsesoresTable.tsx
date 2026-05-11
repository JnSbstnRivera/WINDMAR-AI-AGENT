interface AsesorRow {
  asesor_email: string;
  display_name: string | null;
  departamento: string | null;
  rol: string | null;
  total_messages: number;
  total_convs: number;
}

interface Props {
  data: AsesorRow[];
}

/**
 * Tabla ranking de asesores más activos.
 * Diseño limpio, sin gradientes — apropiado para presentaciones.
 */
export function TopAsesoresTable({ data }: Props) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
      <div className="p-5 border-b border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          🏆 Top asesores más activos
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Por cantidad de mensajes</p>
      </div>

      {data.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm text-slate-400">Sin datos en este periodo</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-left px-5 py-3 font-medium">#</th>
                <th className="text-left px-5 py-3 font-medium">Asesor</th>
                <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">Depto / Rol</th>
                <th className="text-right px-5 py-3 font-medium">Msgs</th>
                <th className="text-right px-5 py-3 font-medium hidden sm:table-cell">Convs</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr
                  key={row.asesor_email}
                  className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-5 py-3 text-slate-400 tabular-nums">{i + 1}</td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-800 dark:text-slate-100">
                      {row.display_name || row.asesor_email.split('@')[0]}
                    </p>
                    <p className="text-xs text-slate-400">{row.asesor_email}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300 hidden sm:table-cell">
                    {row.departamento ? (
                      <>
                        <span>{row.departamento}</span>
                        {row.rol && (
                          <span className="ml-2 inline-block text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {row.rol}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums text-[#1B3A5C] dark:text-blue-300">
                    {row.total_messages}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-slate-500 hidden sm:table-cell">
                    {row.total_convs}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
