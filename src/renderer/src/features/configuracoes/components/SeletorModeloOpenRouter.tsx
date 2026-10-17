import { useMemo, useState } from "react";
import type { ListaOpenRouter, ModeloOpenRouter } from "@shared/ipc";
import { Botao, CampoTexto, Interruptor } from "@/components/ui";
import { formatarContexto, formatarDataHora, formatarPreco } from "../lib/formatar";

interface Props {
  modelo: string;
  lista: ListaOpenRouter | null;
  carregando: boolean;
  mostrarTexto: boolean;
  onMostrarTexto(v: boolean): void;
  onAtualizar(): void;
  onMudar(modelo: string): void;
}

function Selo({ children, verde }: { children: string; verde?: boolean }) {
  return (
    <span className={`rounded-full px-1.5 py-px text-[10px] font-medium ${verde ? "bg-sucesso/15 text-sucesso" : "bg-painel text-suave"}`}>
      {children}
    </span>
  );
}

function Preco({ m }: { m: ModeloOpenRouter }) {
  if (m.gratis) return <Selo verde>grátis</Selo>;
  const partes: string[] = [];
  if (m.precoEntrada !== null) partes.push(`entrada ${formatarPreco(m.precoEntrada)}`);
  if (m.precoAudio !== null) partes.push(`áudio ${formatarPreco(m.precoAudio)}`);
  if (!partes.length) return null;
  return <span className="text-[11px] text-suave">{partes.join(" · ")} / 1M tokens</span>;
}

/** Modelos do OpenRouter: busca, agrupados por fabricante, com preço e contexto. */
export function SeletorModeloOpenRouter({ modelo, lista, carregando, mostrarTexto, onMostrarTexto, onAtualizar, onMudar }: Props) {
  const [busca, setBusca] = useState("");
  const [digitado, setDigitado] = useState("");

  const grupos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const mapa = new Map<string, ModeloOpenRouter[]>();
    for (const m of lista?.modelos ?? []) {
      if (!mostrarTexto && !m.ouveAudio) continue;
      if (termo && !`${m.nome} ${m.id} ${m.fabricante}`.toLowerCase().includes(termo)) continue;
      mapa.set(m.fabricante, [...(mapa.get(m.fabricante) ?? []), m]);
    }
    return [...mapa.entries()]
      .map(([fabricante, itens]) => ({ fabricante, itens: itens.sort((a, b) => a.nome.localeCompare(b.nome)) }))
      .sort((a, b) => a.fabricante.localeCompare(b.fabricante));
  }, [lista, busca, mostrarTexto]);

  const atual = lista?.modelos.find((m) => m.id === modelo);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium">Modelo</label>
        <Botao variante="fantasma" className="!px-2.5 !py-1 text-xs" disabled={carregando} onClick={onAtualizar}>
          {carregando ? "Carregando…" : "Atualizar lista"}
        </Botao>
      </div>

      <p className="text-xs text-suave">
        Escolhido: <span className="font-mono text-texto">{modelo}</span>
        {atual && !atual.ouveAudio && " (só texto: precisa de transcrição)"}
      </p>

      <CampoTexto placeholder="Buscar modelo ou fabricante…" value={busca} onChange={(e) => setBusca(e.target.value)} />

      <div className="max-h-80 overflow-y-auto rounded-xl bg-fundo ring-1 ring-borda">
        {carregando && !lista && <p className="p-4 text-sm text-suave">Buscando a lista no OpenRouter…</p>}
        {lista && !grupos.length && <p className="p-4 text-sm text-suave">Nenhum modelo encontrado.</p>}
        {grupos.map((g) => (
          <div key={g.fabricante}>
            <div className="sticky top-0 z-10 bg-painel px-3 py-1.5 font-titulo text-xs font-medium text-suave">{g.fabricante}</div>
            {g.itens.map((m) => {
              const ativo = m.id === modelo;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onMudar(m.id)}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition ${ativo ? "bg-destaque-claro" : "hover:bg-hover"}`}
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <span className="truncate">{m.nome}</span>
                      {!m.ouveAudio && <Selo>só texto</Selo>}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-suave">{m.id}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                    <Preco m={m} />
                    {m.contexto !== null && <span className="text-[11px] text-suave">contexto {formatarContexto(m.contexto)}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <Interruptor
        ligado={mostrarTexto}
        aoMudar={onMostrarTexto}
        rotulo="Mostrar também modelos só de texto (precisam de transcrição)"
      />

      <div className="space-y-1">
        <span className="block text-xs text-suave">Outro (digitar id)</span>
        <CampoTexto
          spellCheck={false}
          placeholder="ex.: google/gemini-3.8-flash"
          value={digitado}
          onChange={(e) => setDigitado(e.target.value)}
          onBlur={() => digitado.trim() && onMudar(digitado.trim())}
          onKeyDown={(e) => e.key === "Enter" && digitado.trim() && onMudar(digitado.trim())}
          className="font-mono"
        />
      </div>

      {lista && <p className="text-[11px] text-suave">Lista atualizada em {formatarDataHora(lista.atualizadoEm)}.</p>}
      {lista?.erro && <p className="text-xs text-perigo">{lista.erro}</p>}
    </div>
  );
}
