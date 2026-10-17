import { useState } from "react";
import type { EstiloPilula } from "@shared/ipc";
import { CLUBES } from "@shared/temas/clubes";
import { Interruptor } from "@/components/ui";
import type { PropsSecaoPreferencias } from "../../types";
import { AbaEstilos } from "../pilula/AbaEstilos";
import { AbaFutebol } from "../pilula/AbaFutebol";
import { CartaoSecao } from "../CartaoSecao";

type Aba = "estilos" | "futebol";
const ABAS: { id: Aba; rotulo: string }[] = [
  { id: "estilos", rotulo: "Estilos" },
  { id: "futebol", rotulo: "Futebol" },
];

export function SecaoPilula({ preferencias, salvar }: PropsSecaoPreferencias) {
  const { estiloPilula, coresDoClubeNoApp } = preferencias;
  const [aba, setAba] = useState<Aba>(estiloPilula.tipo === "clube" ? "futebol" : "estilos");
  const escolher = (e: EstiloPilula) => void salvar({ estiloPilula: e });
  const clube = estiloPilula.tipo === "clube" ? CLUBES.find((c) => c.id === estiloPilula.id) : undefined;

  return (
    <CartaoSecao titulo="Pílula" descricao="O visual da pílula que aparece enquanto você dita. A escolha vale na hora.">
      <div className="py-3">
        <div role="tablist" className="inline-flex gap-1 rounded-full bg-painel p-1">
          {ABAS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={aba === a.id}
              onClick={() => setAba(a.id)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${aba === a.id ? "bg-cartao font-medium text-texto shadow-cartao" : "text-suave hover:text-texto"}`}
            >
              {a.rotulo}
            </button>
          ))}
        </div>
      </div>
      {/* No topo da aba Futebol (antes ficava no fim, depois dos 20 clubes, e não era visto). */}
      {aba === "futebol" && (
        <Interruptor
          rotulo={clube ? `Usar as cores do ${clube.nome} no app` : "Usar as cores do clube no app"}
          descricao={
            clube
              ? "Menu lateral, faixa no topo, escudo, botões e gráficos ficam nas cores do clube. Desligado, só a pílula muda."
              : "Escolha um clube abaixo para usar. Desligado, só a pílula muda; o app continua no padrão."
          }
          ligado={coresDoClubeNoApp && !!clube}
          desativado={!clube}
          aoMudar={(v) => void salvar({ coresDoClubeNoApp: v })}
        />
      )}
      {aba === "estilos" ? <AbaEstilos estilo={estiloPilula} aoEscolher={escolher} /> : <AbaFutebol estilo={estiloPilula} aoEscolher={escolher} />}
    </CartaoSecao>
  );
}
