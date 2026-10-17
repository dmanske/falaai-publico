import { useState } from "react";
import type { PalavraDicionario } from "@shared/ipc";
import { Botao, CampoTexto } from "@/components/ui";

const SELO: Partial<Record<PalavraDicionario["origem"], string>> = { aprendida: "aprendida", importada: "importada" };

interface Props {
  palavra: PalavraDicionario;
  selecionada: boolean;
  aoSelecionar(marcada: boolean): void;
  aoEditar(id: string, termo: string): Promise<{ ok: boolean; erro?: string }>;
  aoApagar(id: string): void;
}

export function LinhaPalavra({ palavra, selecionada, aoSelecionar, aoEditar, aoApagar }: Props) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(palavra.termo);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (valor.trim() === palavra.termo) return setEditando(false);
    const r = await aoEditar(palavra.id, valor);
    if (r.ok) {
      setEditando(false);
      setErro(null);
    } else setErro(r.erro ?? "Não foi possível salvar.");
  }

  function cancelar() {
    setEditando(false);
    setValor(palavra.termo);
    setErro(null);
  }

  return (
    <li className="px-4 py-3">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={selecionada}
          onChange={(e) => aoSelecionar(e.target.checked)}
          aria-label={`Selecionar ${palavra.termo}`}
          className="h-4 w-4 accent-destaque"
        />
        {editando ? (
          <>
            <CampoTexto
              autoFocus
              value={valor}
              maxLength={80}
              aria-label="Editar palavra"
              onChange={(e) => {
                setValor(e.target.value);
                setErro(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void salvar();
                if (e.key === "Escape") cancelar();
              }}
            />
            <Botao variante="primario" onClick={() => void salvar()}>Salvar</Botao>
            <Botao variante="fantasma" onClick={cancelar}>Cancelar</Botao>
          </>
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate text-base font-medium">{palavra.termo}</span>
            {SELO[palavra.origem] && (
              <span className="rounded-full bg-destaque-claro px-2.5 py-0.5 text-xs font-medium text-destaque">{SELO[palavra.origem]}</span>
            )}
            <Botao variante="fantasma" onClick={() => setEditando(true)}>Editar</Botao>
            <Botao variante="fantasma" className="text-perigo" onClick={() => aoApagar(palavra.id)}>Apagar</Botao>
          </>
        )}
      </div>
      {erro && <p className="mt-2 pl-7 text-sm text-perigo" role="alert">{erro}</p>}
    </li>
  );
}
