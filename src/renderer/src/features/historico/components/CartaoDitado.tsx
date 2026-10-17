import { useLayoutEffect, useRef, useState } from "react";
import type { ItemHistorico } from "@shared/ipc";
import { Botao } from "@/components/ui";
import { formatarHora } from "../lib/agrupar";

const ROTULO_MODO: Record<ItemHistorico["modo"], string> = {
  ditado: "Ditado",
  pergunte: "Pergunte",
  traducao: "Tradução",
};

interface Props {
  item: ItemHistorico;
  copiado: boolean;
  tocando: boolean;
  carregandoAudio: boolean;
  reprocessando: boolean;
  erroAcao: string | null;
  aoCopiar(): void;
  aoOuvir(): void;
  aoReprocessar(): void;
  aoApagar(): void;
}

const BOTAO = "px-3! py-1.5! text-xs!";

export function CartaoDitado({ item, copiado, tocando, carregandoAudio, reprocessando, erroAcao, aoCopiar, aoOuvir, aoReprocessar, aoApagar }: Props) {
  const [aberto, setAberto] = useState(false);
  const [cortado, setCortado] = useState(false);
  const texto = useRef<HTMLParagraphElement>(null);

  // Só oferece "ver mais" se o texto realmente passa de 3 linhas.
  useLayoutEffect(() => {
    const el = texto.current;
    if (el && !aberto) setCortado(el.scrollHeight > el.clientHeight + 1);
  }, [item.texto, aberto]);

  return (
    <li className="rounded-cartao bg-cartao p-5 ring-1 ring-borda">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-suave">
        <span className="font-medium text-texto">{formatarHora(item.criadoEm)}</span>
        {item.app && <span>· {item.app}</span>}
        <span className="rounded-full bg-destaque-claro px-2 py-0.5 text-xs font-medium text-destaque">{ROTULO_MODO[item.modo]}</span>
      </div>

      {item.textoSelecionado && <p className="mb-2 line-clamp-2 border-l-2 border-borda pl-3 text-sm text-suave">{item.textoSelecionado}</p>}

      {item.texto ? (
        <p ref={texto} className={`whitespace-pre-wrap break-words text-base ${aberto ? "" : "line-clamp-3"}`}>
          {item.texto}
        </p>
      ) : (
        <p className="text-base text-suave">(sem texto)</p>
      )}
      {(cortado || aberto) && (
        <button type="button" onClick={() => setAberto((a) => !a)} className="mt-1 text-sm font-medium text-destaque hover:underline">
          {aberto ? "ver menos" : "ver mais"}
        </button>
      )}

      {item.status === "erro" && <p className="mt-2 text-sm text-perigo">{item.erro || "Falhou ao processar este ditado."}</p>}
      {erroAcao && <p className="mt-2 text-sm text-perigo">{erroAcao}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <Botao variante="fantasma" className={BOTAO} onClick={aoCopiar} disabled={!item.texto}>
          {copiado ? "Copiado!" : "Copiar"}
        </Botao>
        {item.temAudio && (
          <Botao variante="fantasma" className={BOTAO} onClick={aoOuvir} disabled={carregandoAudio}>
            {carregandoAudio ? "Carregando…" : tocando ? "Parar" : "Ouvir"}
          </Botao>
        )}
        {item.temAudio && (
          <Botao variante="fantasma" className={BOTAO} onClick={aoReprocessar} disabled={reprocessando}>
            {reprocessando ? "Reprocessando…" : "Reprocessar"}
          </Botao>
        )}
        <Botao variante="fantasma" className={`${BOTAO} text-perigo!`} onClick={aoApagar}>
          Apagar
        </Botao>
      </div>
    </li>
  );
}
