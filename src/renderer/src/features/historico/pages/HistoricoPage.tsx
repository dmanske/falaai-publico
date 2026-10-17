import { useMemo, useState } from "react";
import { Botao, CampoTexto, TituloPagina, Vazio } from "@/components/ui";
import { ApagarTudo } from "../components/ApagarTudo";
import { CartaoDitado } from "../components/CartaoDitado";
import { useAcoesHistorico } from "../hooks/useAcoesHistorico";
import { useCopiar } from "../hooks/useCopiar";
import { useHistorico } from "../hooks/useHistorico";
import { useOuvirAudio } from "../hooks/useOuvirAudio";
import { agruparPorDia } from "../lib/agrupar";

export function HistoricoPage() {
  const [busca, setBusca] = useState("");
  const lista = useHistorico(busca);
  const acoes = useAcoesHistorico({ aoAtualizar: lista.aplicar, aoApagar: lista.remover, aoApagarTudo: lista.limpar });
  const audio = useOuvirAudio();
  const { copiadoId, copiar } = useCopiar();
  const grupos = useMemo(() => agruparPorDia(lista.itens), [lista.itens]);

  return (
    <div>
      <TituloPagina>Histórico</TituloPagina>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="min-w-60 flex-1">
          <CampoTexto placeholder="Buscar no texto ou no app" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <ApagarTudo desativado={lista.itens.length === 0} aoConfirmar={() => void acoes.apagarTudo()} />
      </div>

      {(lista.erro || acoes.erroGeral) && <p className="mb-4 text-sm text-perigo">{lista.erro ?? acoes.erroGeral}</p>}

      {lista.itens.length === 0 && !lista.carregando && (
        <Vazio
          titulo={busca ? "Nada encontrado" : "Nenhum ditado ainda"}
          descricao={busca ? "Tente outra palavra." : "Quando você ditar, o texto aparece aqui."}
        />
      )}

      <div className="space-y-8">
        {grupos.map((g) => (
          <section key={g.chave}>
            <h2 className="mb-3 text-lg font-semibold text-suave">{g.rotulo}</h2>
            <ul className="space-y-3">
              {g.itens.map((item) => (
                <CartaoDitado
                  key={item.id}
                  item={item}
                  copiado={copiadoId === item.id}
                  tocando={audio.tocandoId === item.id}
                  carregandoAudio={audio.carregandoId === item.id}
                  reprocessando={acoes.reprocessando.has(item.id)}
                  erroAcao={acoes.errosReprocesso[item.id] ?? (audio.erro?.id === item.id ? audio.erro.mensagem : null)}
                  aoCopiar={() => void copiar(item.id, item.texto)}
                  aoOuvir={() => void audio.alternar(item.id)}
                  aoReprocessar={() => void acoes.reprocessar(item.id)}
                  aoApagar={() => void acoes.apagar(item.id)}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>

      {lista.temMais && (
        <div className="mt-8 flex justify-center">
          <Botao onClick={() => void lista.carregarMais()} disabled={lista.carregando}>
            {lista.carregando ? "Carregando…" : "Carregar mais"}
          </Botao>
        </div>
      )}
    </div>
  );
}
