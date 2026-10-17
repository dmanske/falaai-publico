import { FRASE_AMOSTRA } from "@shared/config";
import { Botao } from "@/components/ui";
import { useChaveLovable } from "../../hooks/useChaveLovable";
import { useTesteIa } from "../../hooks/useTesteIa";
import type { PropsSecaoPreferencias } from "../../types";
import { CampoChave } from "../CampoChave";
import { CartaoSecao } from "../CartaoSecao";
import { ResultadoTeste } from "../ResultadoTeste";
import { SeletorModelo } from "../SeletorModelo";

interface Props extends PropsSecaoPreferencias {
  recarregar(): Promise<void>;
}

export function SecaoIa({ preferencias, salvar, recarregar }: Props) {
  const chave = useChaveLovable();
  const teste = useTesteIa();

  async function testar() {
    await teste.testar();
    await recarregar();
  }

  return (
    <CartaoSecao titulo="IA" descricao="A IA transcreve e refina o que você fala, pelo gateway da Lovable.">
      <CampoChave
        status={chave.status}
        erro={chave.erro}
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
      <SeletorModelo
        modelo={preferencias.modelo}
        onMudar={(modelo) => {
          void salvar({ modelo });
          teste.limpar();
        }}
      />
      <div className="space-y-3 py-3">
        <div className="flex items-center gap-3">
          <Botao variante="primario" disabled={!chave.status?.configurada || teste.testando} onClick={() => void testar()}>
            {teste.testando ? "Testando…" : "Testar chave"}
          </Botao>
          <span className="text-xs text-suave">Testa o texto e depois uma amostra de voz (“{FRASE_AMOSTRA}”).</span>
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
