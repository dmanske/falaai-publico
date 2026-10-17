import { FRASE_AMOSTRA } from "@shared/config";
import { modeloOuveAudio, PROVEDORES } from "@shared/provedores";
import { Botao } from "@/components/ui";
import { useChave } from "../../hooks/useChave";
import { useModelosOpenRouter } from "../../hooks/useModelosOpenRouter";
import { useProvedor } from "../../hooks/useProvedor";
import { useTesteIa } from "../../hooks/useTesteIa";
import { useTranscricao } from "../../hooks/useTranscricao";
import type { PropsSecaoPreferencias } from "../../types";
import { BlocoTranscricao } from "../BlocoTranscricao";
import { CampoChave } from "../CampoChave";
import { CartaoSecao } from "../CartaoSecao";
import { GradeProvedores } from "../GradeProvedores";
import { ResultadoTeste } from "../ResultadoTeste";
import { SeletorModelo } from "../SeletorModelo";
import { SeletorModeloOpenRouter } from "../SeletorModeloOpenRouter";

interface Props extends PropsSecaoPreferencias {
  recarregar(): Promise<void>;
}

export function SecaoIa({ preferencias, salvar, recarregar }: Props) {
  const { provedor, modelo, escolherProvedor, escolherModelo } = useProvedor(preferencias, salvar);
  const info = PROVEDORES[provedor];
  const chave = useChave(provedor);
  const teste = useTesteIa();
  const openrouter = useModelosOpenRouter(provedor === "openrouter");

  // No OpenRouter a lista carregada diz se o modelo ouve áudio; nos outros, o catálogo.
  const modeloOr = provedor === "openrouter" ? openrouter.lista?.modelos.find((m) => m.id === modelo) : undefined;
  const ouveAudio = modeloOr ? modeloOr.ouveAudio : modeloOuveAudio(provedor, modelo);
  const transcricao = useTranscricao(preferencias, salvar, provedor, !ouveAudio);

  async function testar() {
    await teste.testar();
    await recarregar();
  }

  return (
    <CartaoSecao titulo="IA" descricao="Escolha quem limpa o texto do seu ditado. Cada provedor tem a sua chave; trocar de provedor não apaga nada.">
      <div className="space-y-2 py-3">
        <span className="block text-sm font-medium">Provedor</span>
        <GradeProvedores
          selecionado={provedor}
          onEscolher={(id) => {
            escolherProvedor(id);
            teste.limpar();
          }}
        />
      </div>

      <div className="py-3">
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

      <div className="py-3">
        {provedor === "openrouter" ? (
          <SeletorModeloOpenRouter
            modelo={modelo}
            lista={openrouter.lista}
            carregando={openrouter.carregando}
            mostrarTexto={openrouter.mostrarTexto}
            onMostrarTexto={openrouter.setMostrarTexto}
            onAtualizar={() => void openrouter.atualizar()}
            onMudar={(m) => {
              escolherModelo(m);
              teste.limpar();
            }}
          />
        ) : (
          <SeletorModelo
            key={provedor}
            rotulo="Modelo"
            modelos={info.modelos}
            modelo={modelo}
            placeholderOutro="id do modelo"
            onMudar={(m) => {
              escolherModelo(m);
              teste.limpar();
            }}
          />
        )}
      </div>

      {!ouveAudio && (
        <div className="py-3">
          <BlocoTranscricao
            provedor={provedor}
            servico={transcricao.servico}
            modeloServico={transcricao.modeloServico}
            onServico={(id) => {
              transcricao.escolherServico(id);
              teste.limpar();
            }}
            onModeloServico={(m) => {
              transcricao.escolherModeloServico(m);
              teste.limpar();
            }}
            onChaveMudou={teste.limpar}
          />
        </div>
      )}

      <div className="space-y-3 py-3">
        <div className="flex items-center gap-3">
          <Botao variante="primario" disabled={!chave.status?.configurada || teste.testando} onClick={() => void testar()}>
            {teste.testando ? "Testando…" : "Testar"}
          </Botao>
          <span className="text-xs text-suave">
            Testa o texto{ouveAudio ? "" : ", a transcrição"} e depois uma amostra de voz (“{FRASE_AMOSTRA}”).
          </span>
        </div>
        {teste.resultado && <ResultadoTeste resultado={teste.resultado} />}
        <p className="text-xs text-suave">
          Áudio:{" "}
          {preferencias.formatoAudio ? `pronto para ditado (formato "${preferencias.formatoAudio}")` : "ainda não confirmado — rode o teste"}
        </p>
      </div>
    </CartaoSecao>
  );
}
