import { useEffect } from "react";
import { modeloOuveAudio, PROVEDORES } from "@shared/provedores";
import { Botao } from "@/components/ui";
import { BlocoTranscricao } from "@/features/configuracoes/components/BlocoTranscricao";
import { CampoChave } from "@/features/configuracoes/components/CampoChave";
import { GradeProvedores } from "@/features/configuracoes/components/GradeProvedores";
import { ResultadoTeste } from "@/features/configuracoes/components/ResultadoTeste";
import { useChave } from "@/features/configuracoes/hooks/useChave";
import { usePreferencias } from "@/features/configuracoes/hooks/usePreferencias";
import { useProvedor } from "@/features/configuracoes/hooks/useProvedor";
import { useTesteIa } from "@/features/configuracoes/hooks/useTesteIa";
import { useTranscricao } from "@/features/configuracoes/hooks/useTranscricao";

/** Passo 2: escolha do provedor de IA, chave dele (e da transcrição, se precisar) e teste. */
export function PassoChave({ aoStatus }: { aoStatus(configurada: boolean): void }) {
  const { preferencias, salvar, recarregar } = usePreferencias();

  useEffect(() => {
    // Sem preferências ainda não dá para saber qual chave vale.
    if (!preferencias) aoStatus(false);
  }, [preferencias, aoStatus]);

  if (!preferencias) return null;
  return <Conteudo preferencias={preferencias} salvar={salvar} recarregar={recarregar} aoStatus={aoStatus} />;
}

function Conteudo({
  preferencias,
  salvar,
  recarregar,
  aoStatus,
}: {
  preferencias: NonNullable<ReturnType<typeof usePreferencias>["preferencias"]>;
  salvar: ReturnType<typeof usePreferencias>["salvar"];
  recarregar(): Promise<void>;
  aoStatus(configurada: boolean): void;
}) {
  const { provedor, modelo, escolherProvedor } = useProvedor(preferencias, salvar);
  const info = PROVEDORES[provedor];
  const chave = useChave(provedor);
  const teste = useTesteIa();
  const ouveAudio = modeloOuveAudio(provedor, modelo);
  const transcricao = useTranscricao(preferencias, salvar, provedor, !ouveAudio);
  const configurada = !!chave.status?.configurada;

  useEffect(() => {
    aoStatus(configurada);
  }, [configurada, aoStatus]);

  async function testar() {
    await teste.testar();
    await recarregar();
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-4xl font-bold tracking-tight">Escolha a IA</h1>
        <p className="mt-2 text-base text-suave">
          Ela entende a sua voz e deixa o texto limpo. A chave fica cifrada neste computador; dá para trocar depois em Configurações &gt; IA.
        </p>
      </div>

      <GradeProvedores
        selecionado={provedor}
        onEscolher={(id) => {
          escolherProvedor(id);
          teste.limpar();
        }}
      />

      <div className="mt-5">
        <CampoChave
          key={provedor}
          nome={info.nome}
          status={chave.status}
          erro={chave.erro}
          link={info.linkChave}
          prefixo={info.prefixoChave}
          aviso={info.aviso}
          onSalvar={async (v) => {
            const ok = await chave.salvar(v);
            if (ok) teste.limpar();
            return ok;
          }}
          onApagar={async () => {
            await chave.apagar();
            teste.limpar();
          }}
        />
      </div>

      {!ouveAudio && (
        <div className="mt-5 rounded-xl bg-painel p-4">
          <BlocoTranscricao
            provedor={provedor}
            servico={transcricao.servico}
            modeloServico={transcricao.modeloServico}
            onServico={(id) => {
              transcricao.escolherServico(id);
              teste.limpar();
            }}
            onModeloServico={transcricao.escolherModeloServico}
            onChaveMudou={teste.limpar}
            compacto
          />
          <p className="mt-3 text-xs text-suave">Dá para configurar a transcrição depois, em Configurações &gt; IA, e continuar agora.</p>
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <Botao disabled={!configurada || teste.testando} onClick={() => void testar()}>
          {teste.testando ? "Testando…" : "Testar"}
        </Botao>
        <span className="text-xs text-suave">Opcional: confere se a chave e o modelo respondem.</span>
      </div>
      {teste.resultado && (
        <div className="mt-3">
          <ResultadoTeste resultado={teste.resultado} />
        </div>
      )}
    </div>
  );
}
