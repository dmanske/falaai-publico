import { acharEntrada, rotuloTransporte } from "@shared/microfones";
import { Interruptor, LinhaConfig } from "@/components/ui";
import { useDispositivosAudio } from "../../hooks/useDispositivosAudio";
import { useMicrofones } from "../../hooks/useMicrofones";
import type { PropsSecaoPreferencias } from "../../types";
import { CartaoSecao } from "../CartaoSecao";
import { Seletor } from "../Seletor";

const PADRAO = "__padrao__";
const AVISO_BLUETOOTH = "Microfone Bluetooth: o fone entra em modo de chamada e o áudio piora. Para ditar, prefira o microfone do Mac.";
const AVISO_TAMPA = "A tampa está fechada: o microfone do Mac não capta bem. Escolha outro.";

export function SecaoAudio({ preferencias, salvar }: PropsSecaoPreferencias) {
  const microfones = useMicrofones();
  const salvo = preferencias.microfoneId;
  const sumiu = salvo !== null && microfones.length > 0 && !microfones.some((m) => m.id === salvo);
  const dispositivos = useDispositivosAudio();
  const entradas = dispositivos?.entradas ?? [];
  const tipoDe = (nome: string) => rotuloTransporte(acharEntrada(nome, entradas)?.transporte);

  // Microfone em uso: o escolhido (se ainda existe) ou o padrão do sistema.
  const escolhido = salvo !== null && !sumiu ? microfones.find((m) => m.id === salvo) : undefined;
  const emUso = escolhido ? acharEntrada(escolhido.nome, entradas) : (entradas.find((e) => e.padrao) ?? null);
  const descricao = sumiu
    ? "O microfone escolhido não está conectado; usando o padrão do sistema."
    : emUso?.transporte === "bluetooth"
      ? AVISO_BLUETOOTH
      : dispositivos?.tampaFechada && emUso?.transporte === "embutido"
        ? AVISO_TAMPA
        : undefined;

  return (
    <CartaoSecao titulo="Áudio">
      <LinhaConfig rotulo="Microfone" descricao={descricao}>
        <Seletor
          className="max-w-64"
          value={salvo ?? PADRAO}
          onChange={(e) => void salvar({ microfoneId: e.target.value === PADRAO ? null : e.target.value })}
        >
          <option value={PADRAO}>Padrão do sistema</option>
          {sumiu && <option value={salvo!}>Microfone salvo (indisponível)</option>}
          {microfones.map((m) => (
            <option key={m.id} value={m.id}>
              {tipoDe(m.nome) ? `${m.nome} (${tipoDe(m.nome)})` : m.nome}
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
