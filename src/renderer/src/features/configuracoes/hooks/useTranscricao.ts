import { useCallback, useEffect } from "react";
import type { Preferencias } from "@shared/ipc";
import { modeloTranscricaoPadrao, transcricaoSugerida, type IdProvedor, type IdTranscricao } from "@shared/provedores";

/**
 * Serviço de transcrição e o modelo dele. Quando o modelo do provedor não ouve áudio e nada foi
 * escolhido ainda, grava a sugestão do provedor (`transcricaoSugerida`).
 */
export function useTranscricao(
  preferencias: Preferencias,
  salvar: (p: Partial<Preferencias>) => Promise<void>,
  provedor: IdProvedor,
  precisa: boolean,
) {
  const servico: IdTranscricao | null = preferencias.transcricao ?? (precisa ? transcricaoSugerida(provedor) : null);
  const modeloServico = servico ? (preferencias.modeloPorTranscricao[servico] ?? modeloTranscricaoPadrao(servico)) : null;

  useEffect(() => {
    if (precisa && preferencias.transcricao === null) {
      const sugerida = transcricaoSugerida(provedor);
      if (sugerida) void salvar({ transcricao: sugerida });
    }
  }, [precisa, preferencias.transcricao, provedor, salvar]);

  const escolherServico = useCallback((id: IdTranscricao) => void salvar({ transcricao: id }), [salvar]);

  const escolherModeloServico = useCallback(
    (id: string) => {
      if (servico) void salvar({ modeloPorTranscricao: { ...preferencias.modeloPorTranscricao, [servico]: id } });
    },
    [servico, preferencias.modeloPorTranscricao, salvar],
  );

  return { servico, modeloServico, escolherServico, escolherModeloServico };
}
