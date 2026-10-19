import { Cartao } from "@/components/ui";
import type { Novidade } from "@shared/novidades";
import { dataPorExtenso } from "../lib/formatarData";

export function CartaoVersao({ novidade, instalada }: { novidade: Novidade; instalada: boolean }) {
  return (
    <Cartao>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="font-titulo text-[22px] font-medium">Versão {novidade.versao}</h2>
        {instalada && <span className="rounded-full bg-destaque/15 px-2.5 py-0.5 text-xs font-medium text-destaque">instalada</span>}
        <span className="text-sm text-suave">{dataPorExtenso(novidade.data)}</span>
      </div>
      <ul className="list-disc space-y-2 pl-5 text-[15px] marker:text-suave">
        {novidade.itens.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Cartao>
  );
}
