import type { ReactNode } from "react";
import type { StatusPermissoes } from "@shared/ipc";
import { Botao } from "@/components/ui";

interface Props {
  status: StatusPermissoes;
  onPedir(qual: "microfone" | "acessibilidade" | "ajustes-teclado"): void;
}

function Linha({ ok, titulo, detalhe, acao }: { ok: boolean; titulo: string; detalhe: string; acao?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <div className="text-sm font-medium">
          <span className={ok ? "text-sucesso" : "text-perigo"}>{ok ? "✓" : "⚠"}</span> {titulo}
        </div>
        <p className="mt-0.5 text-xs text-suave">{detalhe}</p>
      </div>
      {!ok && acao}
    </div>
  );
}

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
    <>
      <Linha
        ok={microfoneOk}
        titulo="Microfone"
        detalhe={microfoneOk ? "Liberado." : "Necessário para ouvir o ditado."}
        acao={
          <Botao variante="primario" onClick={() => onPedir("microfone")}>
            {status.microfone === "nao-perguntada" ? "Permitir" : "Abrir Ajustes"}
          </Botao>
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
              <Botao variante="primario" onClick={() => onPedir("acessibilidade")}>
                Abrir Ajustes
              </Botao>
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
            <Botao variante="primario" onClick={() => onPedir("ajustes-teclado")}>
              Abrir Ajustes
            </Botao>
          }
        />
      )}
    </>
  );
}
