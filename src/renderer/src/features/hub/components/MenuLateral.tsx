import type { ReactNode } from "react";
import { AUTOR } from "@shared/config";
import { atualizacaoCurta, descreverBuild } from "@shared/build";
import type { PaginaHub } from "@shared/ipc";
import { apiPreferencias, plataforma } from "../api/ponte";
import { useEscuro } from "../hooks/useEscuro";
import { IconeConfig, IconeDicionario, IconeHistorico, IconeInicio, IconeLua, IconeSobre, IconeSol } from "./Icones";
import { Logo } from "./Logo";

const semArrastar = { WebkitAppRegion: "no-drag" } as React.CSSProperties;
const arrastar = { WebkitAppRegion: "drag" } as React.CSSProperties;

const ITENS: { pagina: PaginaHub; rotulo: string; icone: ReactNode }[] = [
  { pagina: "inicio", rotulo: "Início", icone: <IconeInicio /> },
  { pagina: "historico", rotulo: "Histórico", icone: <IconeHistorico /> },
  { pagina: "dicionario", rotulo: "Dicionário", icone: <IconeDicionario /> },
];

interface Props {
  pagina: PaginaHub;
  secao: string | null;
  onIr(pagina: PaginaHub, secao?: string | null): void;
}

function BotaoIcone({ ativo, titulo, onClick, children }: { ativo: boolean; titulo: string; onClick(): void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${ativo ? "bg-borda text-texto" : "text-suave hover:bg-borda hover:text-texto"}`}
    >
      {children}
    </button>
  );
}

/** Troca entre claro e escuro na hora (fixa o tema; "Sistema" continua em Configurações > Geral). */
function BotaoTema() {
  const escuro = useEscuro();
  const titulo = escuro ? "Usar tema claro" : "Usar tema escuro";
  return (
    <BotaoIcone ativo={false} titulo={titulo} onClick={() => void apiPreferencias.salvar({ tema: escuro ? "claro" : "escuro" })}>
      {escuro ? <IconeSol /> : <IconeLua />}
    </BotaoIcone>
  );
}

function Assinatura() {
  const { quando } = atualizacaoCurta();
  const iniciais = AUTOR.split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  return (
    <div style={semArrastar} className="mt-3 space-y-2">
      <div className="flex items-center gap-2.5 rounded-2xl bg-cartao px-2.5 py-2 shadow-cartao">
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-destaque to-[#8b5cf6] font-titulo text-[12px] font-semibold tracking-wide text-white"
        >
          {iniciais}
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate font-titulo text-[13px] font-medium">{AUTOR}</span>
          <span className="block text-[11px] text-suave">Criador do FalaAi</span>
        </span>
      </div>
      {/* O código do build fica só na dica (passar o mouse) e em Configurações > Sobre. */}
      <div className="flex items-center justify-center px-1.5 text-[11px] text-suave" title={`Última atualização: ${descreverBuild()}`}>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-sucesso" />
          Atualizado {quando}
        </span>
      </div>
    </div>
  );
}

export function MenuLateral({ pagina, secao, onIr }: Props) {
  const mac = plataforma === "darwin";
  return (
    <nav className="m-3 mr-0 flex w-[212px] shrink-0 flex-col rounded-3xl bg-painel p-3">
      {/* Faixa arrastável; no Mac reserva o espaço dos botões vermelho/amarelo/verde. */}
      <div style={arrastar} className={mac ? "h-12 shrink-0" : "h-4 shrink-0"} />
      <div style={arrastar} className="mb-5 py-1">
        <Logo />
      </div>
      <ul style={semArrastar} className="space-y-1">
        {ITENS.map((i) => (
          <li key={i.pagina}>
            <button
              type="button"
              onClick={() => onIr(i.pagina)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-base transition ${
                pagina === i.pagina ? "bg-borda font-medium text-texto" : "text-suave hover:bg-borda/60 hover:text-texto"
              }`}
            >
              {i.icone}
              {i.rotulo}
            </button>
          </li>
        ))}
      </ul>
      <div style={arrastar} className="min-h-4 flex-1" />
      <div style={semArrastar} className="flex items-center justify-center gap-1 border-t border-borda px-1 pt-3">
        <BotaoIcone ativo={pagina === "configuracoes" && secao !== "sobre" && secao !== "atualizacoes"} titulo="Configurações" onClick={() => onIr("configuracoes")}>
          <IconeConfig />
        </BotaoIcone>
        <BotaoIcone ativo={pagina === "configuracoes" && (secao === "sobre" || secao === "atualizacoes")} titulo="Sobre" onClick={() => onIr("configuracoes", "sobre")}>
          <IconeSobre />
        </BotaoIcone>
        <BotaoTema />
      </div>
      {/* Assinatura do criador e marca do build (muda a cada atualização). */}
      <Assinatura />
    </nav>
  );
}
