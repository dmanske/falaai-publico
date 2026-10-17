import type { FundoHub } from "@shared/ipc";
import topo from "@/assets/ondas/topo.jpg";
import baixo from "@/assets/ondas/baixo.jpg";

const MASCARA_TOPO = "linear-gradient(#000 35%, transparent)";
const MASCARA_BAIXO = "linear-gradient(transparent, #000 65%)";

const OPCOES: { id: FundoHub; rotulo: string }[] = [
  { id: "topo", rotulo: "Ondas no topo" },
  { id: "completo", rotulo: "Ondas em cima e embaixo" },
  { id: "nenhum", rotulo: "Sem ondas" },
];

interface Props {
  valor: FundoHub;
  aoMudar(v: FundoHub): void;
}

/** Miniaturas clicáveis para escolher o fundo do hub. */
export function SeletorFundo({ valor, aoMudar }: Props) {
  return (
    <div role="radiogroup" aria-label="Fundo" className="flex gap-3">
      {OPCOES.map(({ id, rotulo }) => {
        const ativo = id === valor;
        return (
          <button key={id} type="button" role="radio" aria-checked={ativo} onClick={() => aoMudar(id)} className="w-[120px] text-center">
            <span
              className={`relative block h-[72px] overflow-hidden rounded-lg bg-white transition ${ativo ? "ring-2 ring-destaque" : "ring-1 ring-borda hover:ring-[rgba(119,119,119,0.4)]"}`}
            >
              {id === "nenhum" ? (
                <span className="fundo-pontilhado absolute inset-0" />
              ) : (
                <span
                  className="absolute inset-x-0 top-0 h-3/4 bg-cover bg-left-top"
                  style={{ backgroundImage: `url(${topo})`, WebkitMaskImage: MASCARA_TOPO, maskImage: MASCARA_TOPO }}
                />
              )}
              {id === "completo" && (
                <span
                  className="absolute inset-x-0 bottom-0 h-3/4 bg-cover bg-left-bottom"
                  style={{ backgroundImage: `url(${baixo})`, WebkitMaskImage: MASCARA_BAIXO, maskImage: MASCARA_BAIXO }}
                />
              )}
            </span>
            <span className={`mt-1.5 block text-xs leading-tight ${ativo ? "font-medium text-texto" : "text-suave"}`}>{rotulo}</span>
          </button>
        );
      })}
    </div>
  );
}
