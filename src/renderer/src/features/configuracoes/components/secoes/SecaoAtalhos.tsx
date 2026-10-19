import { useState } from "react";
import { ATALHOS_PADRAO, atalhosPadrao, validarAtalho, type Atalho, type IdAtalho } from "@shared/atalhos";
import { Botao, Interruptor } from "@/components/ui";
import { plataforma } from "../../api/ponte";
import { useTeclados } from "../../hooks/useTeclados";
import type { PropsSecaoPreferencias } from "../../types";
import { CartaoSecao } from "../CartaoSecao";
import { LinhaAtalho } from "../LinhaAtalho";

const ORDEM = Object.keys(ATALHOS_PADRAO.darwin) as IdAtalho[];
/** Atalhos que gravam voz (a dica do teclado externo só importa para eles). */
const DE_DITADO: IdAtalho[] = ["ditado", "pergunte", "traducao"];
const DICA_TECLADO_EXTERNO =
  "Teclado externo conectado: muitos não têm a tecla Fn (🌐). Se o atalho não funcionar nele, troque por outra tecla (ex.: ⌥ dir.) ou use o toque duplo.";

export function SecaoAtalhos({ preferencias, salvar }: PropsSecaoPreferencias) {
  const [editando, setEditando] = useState<IdAtalho | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ id: IdAtalho; msg: string } | null>(null);
  const teclados = useTeclados();
  const usaFn = DE_DITADO.some((id) => preferencias.atalhos[id].includes("Fn"));
  const dicaTeclado = usaFn && teclados?.some((t) => !t.embutido) === true;

  async function escolher(id: IdAtalho, novo: Atalho) {
    const r = validarAtalho(id, novo, preferencias.atalhos, plataforma);
    setErro(r.erro);
    if (r.erro) return;
    await salvar({ atalhos: { ...preferencias.atalhos, [id]: novo } });
    setAviso(r.aviso ? { id, msg: r.aviso } : null);
    setEditando(null);
  }

  return (
    <CartaoSecao
      titulo="Atalhos"
      descricao={`Monte do seu jeito: combinações (vale Fn)${plataforma === "darwin" ? ", botões extras do mouse" : ""} ou toque duplo numa tecla. Segure para falar; ${
        preferencias.maosLivresComToqueDuplo ? "dois toques rápidos" : "toque rápido"
      } = mãos livres.`}
    >
      {dicaTeclado && <p className="mb-2 rounded-xl bg-painel p-3 text-xs leading-relaxed text-medio">{DICA_TECLADO_EXTERNO}</p>}
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
      <Interruptor
        rotulo="Mãos livres com toque duplo"
        descricao="Desligado: um toque rápido no atalho já liga o mãos livres. Ligado: precisa de dois toques rápidos (evita começar a gravar sem querer)."
        ligado={preferencias.maosLivresComToqueDuplo}
        aoMudar={(v) => void salvar({ maosLivresComToqueDuplo: v })}
      />
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
