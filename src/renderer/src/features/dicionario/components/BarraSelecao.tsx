import { useState } from "react";
import { Botao } from "@/components/ui";

interface Props {
  total: number;
  todasMarcadas: boolean;
  aoMarcarTodas(marcar: boolean): void;
  aoApagar(): void;
}

/** Marcar todas + "Apagar selecionadas" com confirmação na própria barra (sem window.confirm). */
export function BarraSelecao({ total, todasMarcadas, aoMarcarTodas, aoApagar }: Props) {
  const [confirmando, setConfirmando] = useState(false);

  return (
    <div className="flex items-center gap-3 border-b border-borda px-4 py-2.5 text-sm">
      <input
        type="checkbox"
        checked={todasMarcadas}
        onChange={(e) => {
          aoMarcarTodas(e.target.checked);
          setConfirmando(false);
        }}
        aria-label="Selecionar todas"
        className="h-4 w-4 accent-destaque"
      />
      {total === 0 ? (
        <span className="text-suave">Selecionar todas</span>
      ) : confirmando ? (
        <>
          <span className="flex-1">Apagar {total === 1 ? "1 palavra" : `${total} palavras`}?</span>
          <Botao variante="perigo" onClick={() => { setConfirmando(false); aoApagar(); }}>Sim, apagar</Botao>
          <Botao variante="fantasma" onClick={() => setConfirmando(false)}>Cancelar</Botao>
        </>
      ) : (
        <>
          <span className="flex-1 text-suave">{total === 1 ? "1 selecionada" : `${total} selecionadas`}</span>
          <Botao variante="fantasma" className="text-perigo" onClick={() => setConfirmando(true)}>Apagar selecionadas</Botao>
        </>
      )}
    </div>
  );
}
