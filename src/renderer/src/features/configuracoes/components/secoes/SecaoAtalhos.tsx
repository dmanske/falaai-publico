import { useState } from "react";
import { ATALHOS_PADRAO, atalhosPadrao, type Atalho, type IdAtalho } from "@shared/atalhos";
import { Botao } from "@/components/ui";
import { plataforma } from "../../api/ponte";
import { validarAtalho } from "../../lib/atalhos";
import type { PropsSecaoPreferencias } from "../../types";
import { CartaoSecao } from "../CartaoSecao";
import { LinhaAtalho } from "../LinhaAtalho";

const ORDEM = Object.keys(ATALHOS_PADRAO.darwin) as IdAtalho[];

export function SecaoAtalhos({ preferencias, salvar }: PropsSecaoPreferencias) {
  const [editando, setEditando] = useState<IdAtalho | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function escolher(id: IdAtalho, novo: Atalho) {
    const msg = validarAtalho(id, novo, preferencias.atalhos);
    setErro(msg);
    if (msg) return;
    await salvar({ atalhos: { ...preferencias.atalhos, [id]: novo } });
    setEditando(null);
  }

  return (
    <CartaoSecao titulo="Atalhos" descricao="Segure o atalho para falar; solte para colar o texto.">
      {ORDEM.map((id) => (
        <LinhaAtalho
          key={id}
          id={id}
          atalho={preferencias.atalhos[id]}
          editando={editando === id}
          erro={editando === id ? erro : null}
          onEditar={() => {
            setErro(null);
            setEditando(id);
          }}
          onCancelar={() => {
            setErro(null);
            setEditando(null);
          }}
          onEscolher={(a) => void escolher(id, a)}
        />
      ))}
      <div className="pt-4">
        <Botao
          onClick={() => {
            setEditando(null);
            setErro(null);
            void salvar({ atalhos: atalhosPadrao(plataforma) });
          }}
        >
          Restaurar padrão
        </Botao>
      </div>
    </CartaoSecao>
  );
}
