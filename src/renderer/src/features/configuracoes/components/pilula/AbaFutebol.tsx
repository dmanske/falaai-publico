import { useMemo, useState } from "react";
import type { EstiloPilula } from "@shared/ipc";
import { CampoTexto, Vazio } from "@/components/ui";
import { CLUBES, VARIANTES_CLUBE, type Clube } from "@shared/temas/clubes";
import { PilulaMiniatura, urlEscudo } from "@/features/pilula";

/** Minúsculas e sem acento, para a busca achar "Grêmio" digitando "gremio". */
const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function LinhaClube({ clube, estilo, aoEscolher }: { clube: Clube; estilo: EstiloPilula; aoEscolher(e: EstiloPilula): void }) {
  const escudo = urlEscudo(clube.escudo);
  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        {escudo && <img src={escudo} alt="" width={24} height={30} className="h-[30px] w-6 shrink-0" />}
        <div className="min-w-0">
          <div className="text-sm font-medium">{clube.nome}</div>
          <div className="truncate text-xs text-suave">
            {clube.nomeCompleto} · {clube.estado}
          </div>
        </div>
      </div>
      <div role="radiogroup" aria-label={`Variante do ${clube.nome}`} className="mt-3 grid grid-cols-3 gap-2">
        {VARIANTES_CLUBE.map((v) => {
          const valor: EstiloPilula = { tipo: "clube", id: clube.id, variante: v.id };
          const ativo = estilo.tipo === "clube" && estilo.id === clube.id && estilo.variante === v.id;
          return (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={ativo}
              title={v.descricao}
              onClick={() => aoEscolher(valor)}
              className={`flex min-w-0 flex-col items-center gap-1.5 rounded-xl bg-painel px-1.5 py-2.5 text-xs transition ${
                ativo ? "ring-2 ring-destaque" : "ring-1 ring-borda hover:ring-[rgba(119,119,119,0.4)]"
              }`}
            >
              {/* 75%: as 3 variantes cabem lado a lado no cartão. */}
              <span className="block [zoom:0.75]">
                <PilulaMiniatura estilo={valor} />
              </span>
              <span className={ativo ? "font-medium" : "text-suave"}>{v.nome}</span>
            </button>
          );
        })}
      </div>
    </li>
  );
}

/** Clubes da Série A com busca; cada um mostra as 3 variantes da pílula. */
export function AbaFutebol({ estilo, aoEscolher }: { estilo: EstiloPilula; aoEscolher(e: EstiloPilula): void }) {
  const [busca, setBusca] = useState("");
  const lista = useMemo(() => {
    const termo = normalizar(busca);
    return CLUBES.filter((c) => !termo || normalizar(`${c.nome} ${c.nomeCompleto}`).includes(termo));
  }, [busca]);

  return (
    <div className="py-3">
      <CampoTexto value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar clube" aria-label="Buscar clube" />
      {lista.length ? (
        <ul className="mt-1 divide-y divide-borda">
          {lista.map((c) => (
            <LinhaClube key={c.id} clube={c} estilo={estilo} aoEscolher={aoEscolher} />
          ))}
        </ul>
      ) : (
        <Vazio titulo="Nenhum clube encontrado" descricao="Tente outro nome." />
      )}
    </div>
  );
}
