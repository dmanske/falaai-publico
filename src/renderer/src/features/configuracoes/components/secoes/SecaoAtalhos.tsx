import { useState } from "react";
import { ATALHOS_PADRAO, atalhosPadrao, validarAtalho, type Atalho, type IdAtalho } from "@shared/atalhos";
import { Botao } from "@/components/ui";
import { plataforma } from "../../api/ponte";
import type { PropsSecaoPreferencias } from "../../types";
import { CartaoSecao } from "../CartaoSecao";
import { LinhaAtalho } from "../LinhaAtalho";

const ORDEM = Object.keys(ATALHOS_PADRAO.darwin) as IdAtalho[];

export function SecaoAtalhos({ preferencias, salvar }: PropsSecaoPreferencias) {
  const [editando, setEditando] = useState<IdAtalho | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ id: IdAtalho; msg: string } | null>(null);

  async function escolher(id: IdAtalho, novo: Atalho) {
    const r = validarAtalho(id, novo, preferencias.atalhos);
    setErro(r.erro);
    if (r.erro) return;
    await salvar({ atalhos: { ...preferencias.atalhos, [id]: novo } });
    setAviso(r.aviso ? { id, msg: r.aviso } : null);
    setEditando(null);
  }

  return (
    <CartaoSecao titulo="Atalhos" descricao="Monte do seu jeito: combinações (vale Fn) ou toque duplo numa tecla. Segure para falar; toque rápido = mãos livres.">
      {ORDEM.map((id) => (
        <LinhaAtalho
          key={id}
          id={id}
          atalho={preferencias.atalhos[id]}
          editando={editando === id}
          erro={editando === id ? erro : null}
          aviso={aviso?.id === id ? aviso.msg : null}
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
            setAviso(null);
            void salvar({ atalhos: atalhosPadrao(plataforma) });
          }}
        >
          Restaurar padrão
        </Botao>
      </div>
    </CartaoSecao>
  );
}
