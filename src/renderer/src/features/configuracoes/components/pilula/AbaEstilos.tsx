import type { EstiloPilula } from "@shared/ipc";
import { ESTILOS_PILULA } from "@shared/temas/estilosPilula";
import { PilulaMiniatura } from "@/features/pilula";
import { CartaoEstilo } from "./CartaoEstilo";

/** Grade com os estilos gerais da pílula. */
export function AbaEstilos({ estilo, aoEscolher }: { estilo: EstiloPilula; aoEscolher(e: EstiloPilula): void }) {
  return (
    <div role="radiogroup" aria-label="Estilo da pílula" className="grid grid-cols-1 gap-3 py-3 sm:grid-cols-2 xl:grid-cols-3">
      {ESTILOS_PILULA.map((e) => {
        const valor: EstiloPilula = { tipo: "estilo", id: e.id };
        return (
          <CartaoEstilo
            key={e.id}
            selecionado={estilo.tipo === "estilo" && estilo.id === e.id}
            nome={e.nome}
            descricao={e.descricao}
            aoEscolher={() => aoEscolher(valor)}
          >
            <PilulaMiniatura estilo={valor} />
          </CartaoEstilo>
        );
      })}
    </div>
  );
}
