import { useCallback, useState } from "react";
import type { ItemHistorico } from "@shared/ipc";
import { apiHistorico } from "../api/ponte";

interface Retornos {
  aoAtualizar(item: ItemHistorico): void;
  aoApagar(id: string): void;
  aoApagarTudo(): void;
}

/** Ações sobre os itens: apagar, apagar tudo e reprocessar (com estado de carregando/erro por item). */
export function useAcoesHistorico({ aoAtualizar, aoApagar, aoApagarTudo }: Retornos) {
  const [reprocessando, setReprocessando] = useState<Set<string>>(new Set());
  const [errosReprocesso, setErrosReprocesso] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const apagar = useCallback(
    async (id: string) => {
      try {
        await apiHistorico.apagar(id);
        aoApagar(id);
      } catch (e) {
        setErroGeral((e as Error).message || "Não consegui apagar.");
      }
    },
    [aoApagar],
  );

  const apagarTudo = useCallback(async () => {
    try {
      await apiHistorico.apagarTudo();
      aoApagarTudo();
    } catch (e) {
      setErroGeral((e as Error).message || "Não consegui apagar o histórico.");
    }
  }, [aoApagarTudo]);

  const reprocessar = useCallback(
    async (id: string) => {
      setReprocessando((s) => new Set(s).add(id));
      setErrosReprocesso(({ [id]: _antigo, ...resto }) => resto);
      try {
        aoAtualizar(await apiHistorico.reprocessar(id));
      } catch (e) {
        // O Electron prefixa a mensagem ("Error invoking remote method..."): fica só o texto útil.
        const msg = ((e as Error).message || "Falha ao reprocessar.").replace(/^Error invoking remote method '[^']*': (Error: )?/, "");
        setErrosReprocesso((m) => ({ ...m, [id]: msg }));
      } finally {
        setReprocessando((s) => {
          const novo = new Set(s);
          novo.delete(id);
          return novo;
        });
      }
    },
    [aoAtualizar],
  );

  /** Abre o "Salvar como…" do sistema; cancelar a janela não é erro. */
  const baixarAudio = useCallback(async (id: string) => {
    try {
      await apiHistorico.salvarAudio(id);
    } catch (e) {
      const msg = ((e as Error).message || "Não consegui salvar o áudio.").replace(/^Error invoking remote method '[^']*': (Error: )?/, "");
      setErroGeral(msg);
    }
  }, []);

  return { reprocessando, errosReprocesso, erroGeral, apagar, apagarTudo, reprocessar, baixarAudio };
}
