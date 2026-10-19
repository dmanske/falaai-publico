import type { ReactNode } from "react";
import type { EstiloPilula, ModoDitado } from "@shared/ipc";
import { formatarTempoRestante } from "@shared/config";
import { bandeiraDaSigla } from "../lib/bandeiras";
import { resolverVisual } from "../lib/visualEstilo";
import { Onda } from "./Onda";
import "../estilos.css";

/**
 * Cor do modo: o usuário vê quando Espaço/⇧ trocou o modo no meio da gravação.
 * No estilo original colore a própria onda (ditado branco); nos demais aparece como um pontinho no
 * alto da pílula (só quando o modo não é ditado), porque ali a onda tem as cores do estilo.
 */
const COR_MODO: Record<ModoDitado, string> = { ditado: "#ffffff", pergunte: "#8ea2ff", traducao: "#6fe0a6" };
export const NOME_MODO: Record<ModoDitado, string> = { ditado: "Ditado", pergunte: "Pergunte qualquer coisa", traducao: "Tradução" };

interface Props {
  estilo: EstiloPilula;
  estado: "gravando" | "processando";
  modo: ModoDitado;
  /** Sigla do idioma de destino (modo tradução). */
  idioma?: string | null;
  nivel?: number;
  /** Segundos que faltam para o limite da gravação (só nos últimos); null = não mostra. */
  restanteS?: number | null;
  /** Texto no lugar dos pontinhos enquanto processa (ex.: "Demorando mais que o normal…"). */
  nota?: string | null;
  /** Prévia: onda parada e botões sem ação (Configurações). */
  parada?: boolean;
  /** Largura fixa em px (prévia). Sem ela a pílula ocupa a janela inteira. */
  largura?: number;
  aoCancelar?: () => void;
  aoConfirmar?: () => void;
  aoTrocarIdioma?: () => void;
}

const IconeX = () => (
  <svg viewBox="0 0 24 24" strokeWidth={2.6}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
const IconeV = () => (
  <svg viewBox="0 0 24 24" strokeWidth={2.8}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

function Botao({ classe, titulo, desativado, aoClicar, children }: { classe: string; titulo: string; desativado?: boolean; aoClicar?: () => void; children: ReactNode }) {
  if (!aoClicar) {
    return (
      <span className={`pil-botao ${classe}`} style={desativado ? { opacity: 0.45 } : undefined}>
        {children}
      </span>
    );
  }
  return (
    <button type="button" title={titulo} disabled={desativado} onClick={aoClicar} className={`pil-botao ${classe}`}>
      {children}
    </button>
  );
}

/** A pílula inteira (✕, escudo, sigla, onda ou pontos, ✓). Usada na janela real e nas miniaturas. */
export function PilulaVisual({ estilo, estado, modo, idioma, nivel = 0, restanteS = null, nota = null, parada = false, largura, aoCancelar, aoConfirmar, aoTrocarIdioma }: Props) {
  const visual = resolverVisual(estilo);
  const bandeira = idioma ? bandeiraDaSigla(idioma) : undefined;
  const conteudo = (
    <>
      {idioma &&
        (aoTrocarIdioma && estado === "gravando" ? (
          <button type="button" className="pil-sigla" title="Trocar o idioma (ou aperte ⇧ segurando Fn)" onClick={aoTrocarIdioma}>
            {bandeira && <img src={bandeira} alt="" width={16} height={12} />}
            {idioma}
          </button>
        ) : (
          <span className="pil-sigla">
            {bandeira && <img src={bandeira} alt="" width={16} height={12} />}
            {idioma}
          </span>
        ))}
      {estado === "gravando" ? (
        <>
          <Onda nivel={nivel} parada={parada} cor={visual.original && modo !== "ditado" ? COR_MODO[modo] : undefined} />
          {restanteS != null && <span className="pil-tempo">{formatarTempoRestante(restanteS)}</span>}
        </>
      ) : nota ? (
        <span className="pil-nota">{nota}</span>
      ) : (
        <div className="pil-pontos">
          <i />
          <i />
          <i />
        </div>
      )}
    </>
  );
  return (
    <div
      className={visual.classe}
      style={{ ...visual.variaveis, ...(largura ? { width: largura, height: 38, flex: "none" } : undefined) }}
      title={NOME_MODO[modo]}
    >
      <Botao classe="pil-cancelar" titulo="Cancelar (Esc)" aoClicar={aoCancelar}>
        <IconeX />
      </Botao>
      {visual.escudo && <img className="pil-escudo" src={visual.escudo} alt="" draggable={false} />}
      {conteudo}
      <Botao classe="pil-confirmar" titulo="Terminar e colar" desativado={estado !== "gravando"} aoClicar={aoConfirmar}>
        <IconeV />
      </Botao>
      {!visual.original && modo !== "ditado" && <span className="pil-modo" style={{ background: COR_MODO[modo] }} />}
    </div>
  );
}

/** Miniatura para a tela de escolha: gravando, onda parada, sem botões ativos. */
export function PilulaMiniatura({ estilo, modo = "ditado" }: { estilo: EstiloPilula; modo?: ModoDitado }) {
  const extra = resolverVisual(estilo).escudo ? 26 : 0;
  return <PilulaVisual estilo={estilo} estado="gravando" modo={modo} parada largura={144 + extra} />;
}
