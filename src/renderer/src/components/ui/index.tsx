// Componentes visuais comuns a todas as telas (estilo da referência: docs/design/DESIGN_VISUAL.md).
// Componente genérico novo entra aqui; componente de um módulo só fica no módulo.
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

/** Título grande da página (ex.: "Fale, não digite"). */
export function TituloPagina({ children, subtitulo }: { children: ReactNode; subtitulo?: ReactNode }) {
  return (
    <header className="brilho-titulo mb-9">
      <h1 className="cursor-default select-none font-titulo text-[54px] font-semibold leading-[1.05] tracking-[-0.02em]">{children}</h1>
      {subtitulo && <p className="mt-3 text-[15px] text-suave">{subtitulo}</p>}
    </header>
  );
}

/** Título de seção dentro da página (ex.: "Percepções"). */
export function TituloSecao({ children, acao }: { children: ReactNode; acao?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-titulo text-[26px] font-medium tracking-[-0.01em] text-suave">{children}</h2>
      {acao}
    </div>
  );
}

/** Cartão branco arredondado. */
export function Cartao({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-cartao bg-cartao px-6 py-[18px] shadow-cartao ${className}`}>{children}</div>;
}

/** Número grande com unidade pequena e legenda (ex.: "20.6K palavras / Palavras ditadas"). */
export function Numero({ valor, unidade, legenda }: { valor: ReactNode; unidade?: ReactNode; legenda: ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-titulo text-[34px] font-semibold leading-none tracking-[-0.01em]">{valor}</span>
        {unidade && <span className="font-titulo text-[15px] font-medium">{unidade}</span>}
      </div>
      <div className="mt-1.5 text-[15px] leading-snug text-suave">{legenda}</div>
    </div>
  );
}

type VarianteBotao = "primario" | "destaque" | "secundario" | "fantasma" | "perigo";

const ESTILO_BOTAO: Record<VarianteBotao, string> = {
  /** Ação principal: quase preto (claro) / quase branco (escuro), como na referência. */
  primario: "bg-acao text-acao-texto hover:opacity-85",
  destaque: "bg-destaque text-white hover:opacity-90",
  secundario: "bg-cartao text-texto ring-1 ring-borda hover:bg-hover",
  fantasma: "text-texto hover:bg-hover",
  perigo: "bg-perigo text-white hover:opacity-90",
};

export function Botao({
  variante = "secundario",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: VarianteBotao }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${ESTILO_BOTAO[variante]} ${className}`}
    />
  );
}

export function CampoTexto({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl bg-cartao px-3.5 py-2.5 text-sm outline-none ring-1 ring-borda transition placeholder:text-apagado hover:ring-[rgba(119,119,119,0.3)] focus:ring-2 focus:ring-destaque ${className}`}
    />
  );
}

/** Tecla desenhada (ex.: atalhos "Fn" "F12"). */
export function Tecla({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-9 min-w-9 items-center justify-center rounded-[10px] bg-cartao px-2.5 font-titulo text-[17px] font-medium text-texto shadow-tecla">
      {children}
    </kbd>
  );
}

/** Interruptor liga/desliga. */
export function Interruptor({
  ligado,
  aoMudar,
  rotulo,
  descricao,
  desativado,
}: {
  ligado: boolean;
  aoMudar(v: boolean): void;
  rotulo: ReactNode;
  descricao?: ReactNode;
  desativado?: boolean;
}) {
  return (
    <label className={`flex items-start justify-between gap-6 py-3 ${desativado ? "opacity-50" : "cursor-pointer"}`}>
      <span>
        <span className="block text-sm font-medium">{rotulo}</span>
        {descricao && <span className="mt-0.5 block text-xs text-suave">{descricao}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={ligado}
        disabled={desativado}
        onClick={() => aoMudar(!ligado)}
        className={`relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition ${ligado ? "bg-destaque" : "bg-borda"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${ligado ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}

/** Linha de configuração com rótulo à esquerda e controle à direita. */
export function LinhaConfig({ rotulo, descricao, children }: { rotulo: ReactNode; descricao?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-3">
      <span>
        <span className="block text-sm font-medium">{rotulo}</span>
        {descricao && <span className="mt-0.5 block text-xs text-suave">{descricao}</span>}
      </span>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function Vazio({ titulo, descricao, acao }: { titulo: ReactNode; descricao?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-base font-medium">{titulo}</p>
      {descricao && <p className="mt-1 max-w-sm text-sm text-suave">{descricao}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}
