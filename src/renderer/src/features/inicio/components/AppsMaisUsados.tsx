import type { ResumoEstatisticas } from "@shared/ipc";
import { Cartao } from "@/components/ui";
import { formatarPalavras } from "../lib/formatar";

/** Ranking de apps com uma barrinha proporcional às palavras. */
export function AppsMaisUsados({ apps }: { apps: ResumoEstatisticas["porApp"] }) {
  const maior = Math.max(1, ...apps.map((a) => a.palavras));
  return (
    <Cartao>
      <h3 className="mb-4 text-base font-semibold text-suave">Apps mais usados</h3>
      {apps.length === 0 ? (
        <p className="text-sm text-suave">Ainda sem ditados.</p>
      ) : (
        <ul className="space-y-3">
          {apps.slice(0, 6).map((a) => (
            <li key={a.app}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-medium">{a.app}</span>
                <span className="shrink-0 text-suave">{formatarPalavras(a.palavras)} palavras</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-painel">
                <div className="h-full rounded-full bg-destaque" style={{ width: `${Math.max(4, (a.palavras / maior) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}
