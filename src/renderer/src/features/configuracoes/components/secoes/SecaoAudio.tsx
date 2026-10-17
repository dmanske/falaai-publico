import { Interruptor, LinhaConfig } from "@/components/ui";
import { useMicrofones } from "../../hooks/useMicrofones";
import type { PropsSecaoPreferencias } from "../../types";
import { CartaoSecao } from "../CartaoSecao";
import { Seletor } from "../Seletor";

const PADRAO = "__padrao__";

export function SecaoAudio({ preferencias, salvar }: PropsSecaoPreferencias) {
  const microfones = useMicrofones();
  const salvo = preferencias.microfoneId;
  const sumiu = salvo !== null && microfones.length > 0 && !microfones.some((m) => m.id === salvo);

  return (
    <CartaoSecao titulo="Áudio">
      <LinhaConfig rotulo="Microfone" descricao={sumiu ? "O microfone escolhido não está conectado; usando o padrão do sistema." : undefined}>
        <Seletor
          className="max-w-64"
          value={salvo ?? PADRAO}
          onChange={(e) => void salvar({ microfoneId: e.target.value === PADRAO ? null : e.target.value })}
        >
          <option value={PADRAO}>Padrão do sistema</option>
          {sumiu && <option value={salvo!}>Microfone salvo (indisponível)</option>}
          {microfones.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </Seletor>
      </LinhaConfig>
      <Interruptor
        rotulo="Silenciar música e vídeo enquanto grava"
        descricao="O som do computador fica mudo durante o ditado e volta ao soltar."
        ligado={preferencias.silenciarFundo}
        aoMudar={(v) => void salvar({ silenciarFundo: v })}
      />
      <Interruptor
        rotulo="Sons de início e fim"
        descricao="Um sinal curto ao começar e ao terminar o ditado."
        ligado={preferencias.sons}
        aoMudar={(v) => void salvar({ sons: v })}
      />
    </CartaoSecao>
  );
}
