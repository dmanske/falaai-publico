import { useMemo, useState } from "react";
import type { ResumoEstatisticas } from "@shared/ipc";
import { CALENDARIO_MAX_SEMANAS_ATRAS, CALENDARIO_PASSO_SEMANAS, CALENDARIO_SEMANAS } from "../lib/constantes";
import { gerarGrade } from "../lib/calendario";

const LINHAS = ["D", "S", "T", "Q", "Q", "S", "S"];

/** Intensidade → cor (tons do azul de destaque; funciona no claro e no escuro). */
function corDoNivel(nivel: number): string | undefined {
  // Nível 0 fica com o hachurado (.celula-vazia); os outros nos tons de azul da referência.
  return [undefined, "var(--color-destaque-claro)", "var(--color-destaque-2)", "var(--color-destaque-3)", "var(--color-destaque)"][nivel];
}

const CELULA = "aspect-square w-full max-w-[18px] rounded-[4px]";

export function Calendario({ porDia }: { porDia: ResumoEstatisticas["porDia"] }) {
  const [deslocamento, setDeslocamento] = useState(0);
  const maxDeslocamento = CALENDARIO_MAX_SEMANAS_ATRAS - CALENDARIO_SEMANAS;
  // "hoje" fixo enquanto a tela está aberta é suficiente (a grade recalcula quando os dados mudam).
  const grade = useMemo(() => gerarGrade(porDia, new Date(), deslocamento), [porDia, deslocamento]);

  return (
    <div>
      <div className="flex gap-2">
        {/* Grade fluida: as células encolhem para caber no cartão (antes vazava em janela estreita). */}
        <div
          className="grid min-w-0 flex-1 gap-[3px]"
          style={{ gridTemplateColumns: `auto repeat(${grade.semanas.length}, minmax(0, 1fr))` }}
        >
          {LINHAS.map((rotulo, linha) => [
            <span key={`r${linha}`} className="flex items-center pr-1.5 text-xs text-suave" aria-hidden>
              {rotulo}
            </span>,
            ...grade.semanas.map((semana, c) => {
              const cel = semana[linha];
              return cel ? (
                <div
                  key={cel.dia}
                  title={cel.futuro ? undefined : `${cel.dia.split("-").reverse().join("/")}: ${cel.palavras} palavras`}
                  className={`${CELULA} ${cel.nivel === 0 ? "celula-vazia" : ""} ${cel.futuro ? "invisible" : ""}`}
                  style={{ background: corDoNivel(cel.nivel) }}
                />
              ) : (
                <div key={`v${linha}-${c}`} />
              );
            }),
          ])}
        </div>
      </div>
      <div className="flex gap-2">
        {/* Espaço da coluna dos rótulos (D S T…) para os meses alinharem com as células. */}
        <span className="invisible pr-1.5 text-xs" aria-hidden>
          Q
        </span>
        <div className="min-w-0 flex-1">
          {/* Rótulos dos meses, alinhados à coluna em que o mês começa. */}
          <div className="relative mt-2 h-4 text-xs text-suave">
            {grade.meses.map((m) => (
              <span key={m.coluna} className="absolute" style={{ left: `${(m.coluna / CALENDARIO_SEMANAS) * 100}%` }}>
                {m.rotulo}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-suave">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Ver período anterior"
            disabled={deslocamento >= maxDeslocamento}
            onClick={() => setDeslocamento((d) => Math.min(maxDeslocamento, d + CALENDARIO_PASSO_SEMANAS))}
            className="rounded-lg px-2 py-1 hover:bg-painel disabled:opacity-30"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Ver período seguinte"
            disabled={deslocamento <= 0}
            onClick={() => setDeslocamento((d) => Math.max(0, d - CALENDARIO_PASSO_SEMANAS))}
            className="rounded-lg px-2 py-1 hover:bg-painel disabled:opacity-30"
          >
            ›
          </button>
        </div>
        <div className="flex items-center gap-2">
          Menos
          {[0, 1, 2, 3, 4].map((n) => (
            <span key={n} className={`h-4 w-4 rounded-[4px] ${n === 0 ? "celula-vazia" : ""}`} style={{ background: corDoNivel(n) }} />
          ))}
          Mais
        </div>
      </div>
    </div>
  );
}
