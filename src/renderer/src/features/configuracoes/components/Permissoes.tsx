import type { ReactNode } from "react";
import type { StatusPermissoes } from "@shared/ipc";

interface Props {
  status: StatusPermissoes;
  onPedir(qual: "microfone" | "acessibilidade" | "ajustes-teclado"): void;
}

function Linha({ ok, titulo, detalhe, acao }: { ok: boolean; titulo: string; detalhe: string; acao?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-neutral-200 p-3 text-sm dark:border-neutral-800">
      <div>
        <div className="font-medium">
          {ok ? "✓" : "⚠️"} {titulo}
        </div>
        <p className="text-xs text-neutral-500">{detalhe}</p>
      </div>
      {!ok && acao}
    </div>
  );
}

const botao = "shrink-0 whitespace-nowrap rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white";

const TECLA_FN: Record<NonNullable<StatusPermissoes["teclaFnDoSistema"]>, string> = {
  nada: "",
  idioma: "trocar o idioma do teclado",
  emoji: "abrir os emojis",
  ditado: "abrir o ditado da Apple",
};

export function Permissoes({ status, onPedir }: Props) {
  const mac = status.plataforma === "darwin";
  const microfoneOk = status.microfone === "concedida";
  const fnAtrapalha = status.teclaFnDoSistema !== null && status.teclaFnDoSistema !== "nada";

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium">Permissões</h2>
      <Linha
        ok={microfoneOk}
        titulo="Microfone"
        detalhe={microfoneOk ? "Liberado." : "Necessário para ouvir o ditado."}
        acao={
          <button type="button" className={botao} onClick={() => onPedir("microfone")}>
            {status.microfone === "nao-perguntada" ? "Permitir" : "Abrir Ajustes"}
          </button>
        }
      />
      {mac && (
        <Linha
          ok={status.acessibilidade === true && status.tecladoAtivo}
          titulo="Acessibilidade (tecla Fn e colar)"
          detalhe={
            status.erroAuxiliar
              ? status.erroAuxiliar
              : status.acessibilidade
                ? status.tecladoAtivo
                  ? "Liberado. Segure Fn para ditar."
                  : "Liberado; ligando a leitura do teclado…"
                : "Ajustes > Privacidade e Segurança > Acessibilidade: ligue o FalaAi (em desenvolvimento, o app que abriu o FalaAi, ex.: VS Code ou Terminal)."
          }
          acao={
            !status.erroAuxiliar && (
              <button type="button" className={botao} onClick={() => onPedir("acessibilidade")}>
                Abrir Ajustes
              </button>
            )
          }
        />
      )}
      {mac && fnAtrapalha && (
        <Linha
          ok={false}
          titulo="Tecla 🌐/Fn do Mac"
          detalhe={`Hoje ela está configurada para ${TECLA_FN[status.teclaFnDoSistema!]}, o que atrapalha o ditado. Em Ajustes > Teclado, mude "Pressionar tecla 🌐 para" para "Não fazer nada".`}
          acao={
            <button type="button" className={botao} onClick={() => onPedir("ajustes-teclado")}>
              Abrir Ajustes
            </button>
          }
        />
      )}
    </div>
  );
}
