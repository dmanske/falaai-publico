import { useEffect, useState } from "react";
import type { ConteudoCartao } from "@shared/ipc";
import { useTema } from "../hooks/useTema";

export function CartaoApp() {
  useTema();
  const [c, setC] = useState<ConteudoCartao | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    document.body.style.background = "transparent";
    return window.ponte.janelas.aoConteudoCartao((novo) => {
      setC(novo);
      setCopiado(false);
    });
  }, []);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && window.ponte.janelas.fecharCartao();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);

  async function copiar() {
    if (!c) return;
    try {
      await navigator.clipboard.writeText(c.resposta);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      /* sem permissão de área de transferência: o usuário ainda pode selecionar o texto */
    }
  }

  return (
    <div className="h-screen p-2">
      <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-cartao text-texto shadow-lg ring-1 ring-borda">
        <div className="flex items-start gap-3 px-4 pt-3">
          <p className="line-clamp-2 flex-1 select-text text-xs text-suave">{c?.pergunta}</p>
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => window.ponte.janelas.fecharCartao()}
            className="rounded-lg px-2 py-0.5 text-sm text-suave hover:bg-painel"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 select-text overflow-y-auto whitespace-pre-wrap break-words px-4 py-3 text-sm leading-relaxed">{c?.resposta}</div>
        <div className="flex justify-end border-t border-borda px-4 py-2.5">
          <button
            type="button"
            onClick={() => void copiar()}
            className="rounded-xl bg-destaque px-4 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            {copiado ? "Copiado!" : "Copiar"}
          </button>
        </div>
      </div>
    </div>
  );
}
