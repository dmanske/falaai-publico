import { useState } from "react";
import { Botao } from "@/components/ui";

/** "Apagar tudo" com confirmação na própria tela (sem janela do sistema). */
export function ApagarTudo({ desativado, aoConfirmar }: { desativado: boolean; aoConfirmar(): void }) {
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <Botao disabled={desativado} onClick={() => setConfirmando(true)}>
        Apagar tudo
      </Botao>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-suave">Apagar todo o histórico e os áudios?</span>
      <Botao
        variante="perigo"
        onClick={() => {
          setConfirmando(false);
          aoConfirmar();
        }}
      >
        Sim, apagar
      </Botao>
      <Botao onClick={() => setConfirmando(false)}>Cancelar</Botao>
    </div>
  );
}
