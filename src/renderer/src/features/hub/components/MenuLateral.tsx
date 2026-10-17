import type { ReactNode } from "react";
import type { PaginaHub } from "@shared/ipc";
import { plataforma } from "../api/ponte";
import { IconeConfig, IconeDicionario, IconeHistorico, IconeInicio, IconeSobre } from "./Icones";
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

export function MenuLateral({ pagina, secao, onIr }: Props) {
  const mac = plataforma === "darwin";
  return (
    <nav className="m-3 mr-0 flex w-60 shrink-0 flex-col rounded-3xl bg-painel p-3">
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
      <div style={semArrastar} className="flex items-center gap-1 border-t border-borda px-1 pt-3">
        <BotaoIcone ativo={pagina === "configuracoes" && secao !== "sobre" && secao !== "atualizacoes"} titulo="Configurações" onClick={() => onIr("configuracoes")}>
          <IconeConfig />
        </BotaoIcone>
        <BotaoIcone ativo={pagina === "configuracoes" && (secao === "sobre" || secao === "atualizacoes")} titulo="Sobre" onClick={() => onIr("configuracoes", "sobre")}>
          <IconeSobre />
        </BotaoIcone>
      </div>
    </nav>
  );
}
