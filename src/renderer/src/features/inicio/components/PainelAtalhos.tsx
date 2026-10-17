import { NOMES_ATALHOS, rotuloTecla, type Atalho, type IdAtalho } from "@shared/atalhos";
import { Tecla } from "@/components/ui";
import { plataforma } from "../api/ponte";

const ORDEM: IdAtalho[] = ["ditado", "traducao", "pergunte", "colarUltima"];

/** Nomes curtos, como no painel da referência ("Ditado", "Traduzir", "Pergunte qualquer coisa"). */
const NOMES_CURTOS: Partial<Record<IdAtalho, string>> = { colarUltima: "Colar a última" };

/**
 * Painel cinza-quente com os atalhos (igual à referência: sem título, nome da função em cima e as
 * teclas com relevo embaixo). Rodapé com uma dica de uso — toque próprio do FalaAi.
 */
export function PainelAtalhos({ atalhos }: { atalhos: Record<IdAtalho, Atalho> | null }) {
  const teclaDitado = atalhos ? atalhos.ditado.map((t) => rotuloTecla(t, plataforma)).join("+") : "Fn";
  return (
    <div className="rounded-cartao bg-painel px-6 pb-5 pt-6">
      {atalhos && (
        <div className="space-y-[22px]">
          {ORDEM.map((id) => (
            <div key={id}>
              <div className="mb-2.5 text-[15px] leading-none text-texto/85">{NOMES_CURTOS[id] ?? NOMES_ATALHOS[id]}</div>
              <div className="flex flex-wrap gap-2">
                {atalhos[id].map((t) => (
                  <Tecla key={t}>{rotuloTecla(t, plataforma)}</Tecla>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-6 border-t border-borda pt-4 text-[12px] leading-relaxed text-suave">
        Toque rápido em <span className="font-medium text-medio">{teclaDitado}</span> para falar sem segurar.{" "}
        <span className="font-medium text-medio">Esc</span> cancela.
      </p>
    </div>
  );
}
