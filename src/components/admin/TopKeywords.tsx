interface Props {
  data: Array<{
    word: string;
    frequency: number;
  }>;
}

/**
 * Lista visual de top palabras buscadas. Muestra qué les importa a los
 * asesores en el chat — insight para mejorar el SYSTEM_PROMPT o KB.
 *
 * Estilo "tag cloud" simple: tamaño y opacidad varían con la frecuencia.
 */
export function TopKeywords({ data }: Props) {
  // Calcular el rango para escalar visualmente
  const maxFreq = data.length > 0 ? data[0].frequency : 1;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
        🔥 Top palabras buscadas
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Las {data.length} más frecuentes en preguntas de asesores
      </p>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[240px]">
          <p className="text-sm text-slate-400">Sin datos en este periodo</p>
        </div>
      ) : (
        <div className="flex flex-wrap items-baseline gap-2 min-h-[240px]">
          {data.map((kw) => {
            // Escala: las palabras más frecuentes son más grandes y más opacas
            const ratio = kw.frequency / maxFreq; // 0..1
            const size =
              ratio > 0.7 ? 'text-2xl' :
              ratio > 0.5 ? 'text-xl' :
              ratio > 0.3 ? 'text-base' :
                            'text-sm';
            const weight = ratio > 0.5 ? 'font-bold' : 'font-medium';
            const color =
              ratio > 0.7 ? 'text-[#F7941D]' :
              ratio > 0.5 ? 'text-[#1B3A5C] dark:text-blue-300' :
                            'text-slate-600 dark:text-slate-400';
            return (
              <span
                key={kw.word}
                className={`${size} ${weight} ${color} hover:opacity-80 transition-opacity cursor-default tracking-tight`}
                title={`${kw.word} · ${kw.frequency} menciones`}
              >
                {kw.word}
                <sup className="text-[0.6em] ml-0.5 text-slate-400 font-normal tabular-nums">
                  {kw.frequency}
                </sup>
              </span>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-slate-400 mt-4 italic">
        Excluye stop words en español. Mínimo 4 letras por palabra.
      </p>
    </div>
  );
}
