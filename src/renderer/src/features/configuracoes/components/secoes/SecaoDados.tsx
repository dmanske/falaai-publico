import { Interruptor, LinhaConfig } from "@/components/ui";
import type { PropsSecaoPreferencias } from "../../types";
import { CartaoSecao } from "../CartaoSecao";
import { Seletor } from "../Seletor";

const OPCOES: { valor: number | null; rotulo: string }[] = [
  { valor: null, rotulo: "Nunca" },
  { valor: 7, rotulo: "7 dias" },
  { valor: 30, rotulo: "30 dias" },
  { valor: 90, rotulo: "90 dias" },
  { valor: 365, rotulo: "365 dias" },
];

export function SecaoDados({ preferencias, salvar }: PropsSecaoPreferencias) {
  return (
    <CartaoSecao titulo="Dados e privacidade" descricao="Tudo fica neste computador. Só o áudio e o texto de cada ditado vão para a IA que você configurou.">
      <Interruptor
        rotulo="Guardar o áudio dos ditados"
        descricao="Permite ouvir e reprocessar um ditado depois."
        ligado={preferencias.guardarAudio}
        aoMudar={(v) => void salvar({ guardarAudio: v })}
      />
      <LinhaConfig rotulo="Apagar histórico depois de" descricao="Ditados mais antigos que isso são removidos automaticamente.">
        <Seletor
          value={preferencias.retencaoDias === null ? "nunca" : String(preferencias.retencaoDias)}
          onChange={(e) => void salvar({ retencaoDias: e.target.value === "nunca" ? null : Number(e.target.value) })}
        >
          {OPCOES.map((o) => (
            <option key={o.rotulo} value={o.valor === null ? "nunca" : String(o.valor)}>
              {o.rotulo}
            </option>
          ))}
        </Seletor>
      </LinhaConfig>
      <Interruptor
        rotulo="Aprender com as correções"
        descricao="Se você corrigir uma palavra logo após colar, ela entra no dicionário."
        ligado={preferencias.aprenderCorrecoes}
        aoMudar={(v) => void salvar({ aprenderCorrecoes: v })}
      />
      <Interruptor
        rotulo="Usar o contexto do app em foco"
        descricao="Envia o nome do app, da janela e o texto ao redor do cursor para a IA acertar o tom."
        ligado={preferencias.usarContexto}
        aoMudar={(v) => void salvar({ usarContexto: v })}
      />
    </CartaoSecao>
  );
}
