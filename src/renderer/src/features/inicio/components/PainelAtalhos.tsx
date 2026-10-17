import { NOMES_ATALHOS, rotuloTecla, type Atalho, type IdAtalho } from "@shared/atalhos";
import { Cartao, Tecla } from "@/components/ui";
import { plataforma } from "../api/ponte";

const ORDEM: IdAtalho[] = ["ditado", "traducao", "pergunte", "colarUltima"];

export function PainelAtalhos({ atalhos }: { atalhos: Record<IdAtalho, Atalho> | null }) {
  return (
    <Cartao>
      <h3 className="mb-4 text-base font-semibold text-suave">Atalhos</h3>
      {atalhos && (
        <div className="space-y-5">
          {ORDEM.map((id) => (
            <div key={id}>
              <div className="mb-2 text-sm">{NOMES_ATALHOS[id]}</div>
              <div className="flex flex-wrap gap-2">
                {atalhos[id].map((t) => (
                  <Tecla key={t}>{rotuloTecla(t, plataforma)}</Tecla>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Cartao>
  );
}
