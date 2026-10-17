import type { ReactNode } from "react";

/** Cartão clicável de uma opção de pílula: prévia em cima, nome e descrição embaixo. Selecionado: ring-2 ring-destaque. */
export function CartaoEstilo({
  selecionado,
  nome,
  descricao,
  aoEscolher,
  children,
}: {
  selecionado: boolean;
  nome: string;
  descricao?: string;
  aoEscolher(): void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selecionado}
      onClick={aoEscolher}
      className={`flex flex-col items-center gap-2 rounded-2xl bg-cartao p-3 text-center transition ${
        selecionado ? "ring-2 ring-destaque" : "ring-1 ring-borda hover:ring-[rgba(119,119,119,0.4)]"
      }`}
    >
      {/* Fundo pontilhado: mostra a pílula translúcida (vidro) como ela aparece sobre uma tela. */}
      <span className="fundo-pontilhado flex h-16 w-full items-center justify-center rounded-xl bg-painel">{children}</span>
      <span className="block text-sm font-medium">{nome}</span>
      {descricao && <span className="block text-xs text-suave">{descricao}</span>}
    </button>
  );
}
