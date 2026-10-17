import { useEffect, useRef, useState } from "react";
import { NOME_APP } from "@shared/config";
import { NOMES_ATALHOS, rotuloTecla, type IdAtalho } from "@shared/atalhos";
import type { Preferencias, ResultadoTesteIa, StatusChave } from "@shared/ipc";
import { Botao, CampoTexto, Tecla } from "@/components/ui";
import { useNivelMicrofone } from "../hooks/useNivelMicrofone";
import { usePermissoes } from "../hooks/usePermissoes";

function Titulo({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-4xl font-bold tracking-tight">{children}</h1>
      {sub && <p className="mt-2 text-base text-suave">{sub}</p>}
    </div>
  );
}

function Selo({ ok, children }: { ok: boolean | null; children: React.ReactNode }) {
  const cor = ok === null ? "text-suave" : ok ? "text-sucesso" : "text-perigo";
  return (
    <span className={`text-sm font-medium ${cor}`}>
      {ok === null ? "…" : ok ? "✓" : "✗"} {children}
    </span>
  );
}

function Atalho({ teclas, plataforma }: { teclas: string[]; plataforma: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {teclas.map((t, i) => (
        <span key={t + i} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-suave">+</span>}
          <Tecla>{rotuloTecla(t, plataforma)}</Tecla>
        </span>
      ))}
    </span>
  );
}

/* 1 ---------------------------------------------------------------- */
/** Boas-vindas: o logo e a frase já estão no papel de parede (fundo da janela); aqui só o resumo. */
export function PassoBoasVindas({ prefs }: { prefs: Preferencias | null }) {
  const plataforma = window.ponte.plataforma;
  return (
    <div className="flex h-full flex-col justify-end">
      <h1 className="sr-only">{NOME_APP} — Fale, não digite.</h1>
      <ul className="space-y-3 rounded-cartao bg-white/75 p-5 text-[15px] shadow-cartao backdrop-blur-md">
        <li>
          <b>1. Segure</b>{" "}
          {prefs ? <Atalho teclas={prefs.atalhos.ditado} plataforma={plataforma} /> : "a tecla de ditado"}, <b>fale</b> e <b>solte</b>. O texto aparece onde o cursor estiver.
        </li>
        <li>
          <b>2. A IA limpa o texto</b>: tira os "é...", "tipo", corrige a pontuação e entende o contexto.
        </li>
        <li>
          <b>3. Tudo fica no seu computador.</b> Histórico, dicionário e chaves são guardados só aqui.
        </li>
      </ul>
    </div>
  );
}

/* 3 ---------------------------------------------------------------- */
export function PassoPermissoes() {
  const { status, pedir } = usePermissoes();
  const mac = status?.plataforma === "darwin";
  const micOk = status?.microfone === "concedida";
  return (
    <div>
      <Titulo sub="Duas permissões do sistema deixam o FalaAi gravar e escrever por você.">Permissões</Titulo>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-painel p-4">
          <div>
            <div className="text-sm font-semibold">Microfone</div>
            <div className="text-sm text-suave">Para ouvir o que você fala.</div>
          </div>
          <div className="flex items-center gap-3">
            <Selo ok={status ? micOk : null}>{micOk ? "liberado" : "pendente"}</Selo>
            {!micOk && status && (
              <Botao variante="primario" onClick={() => void pedir("microfone")}>
                {status.microfone === "nao-perguntada" ? "Permitir" : "Abrir Ajustes"}
              </Botao>
            )}
          </div>
        </div>

        {mac && (
          <div className="rounded-xl bg-painel p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Acessibilidade</div>
                <div className="text-sm text-suave">Para ler a tecla Fn e colar o texto no app onde você está.</div>
              </div>
              <div className="flex items-center gap-3">
                <Selo ok={status ? status.acessibilidade === true : null}>{status?.acessibilidade ? "liberado" : "pendente"}</Selo>
                {!status?.acessibilidade && (
                  <Botao variante="primario" onClick={() => void pedir("acessibilidade")}>
                    Abrir Ajustes
                  </Botao>
                )}
              </div>
            </div>
            <p className="mt-2 text-xs text-suave">
              Em desenvolvimento, o app que precisa ser liberado pode ser o VS Code ou o Terminal, não o FalaAi.
            </p>
          </div>
        )}

        {mac && status && status.teclaFnDoSistema && status.teclaFnDoSistema !== "nada" && (
          <div className="rounded-xl bg-destaque-claro p-4">
            <div className="text-sm font-semibold">A tecla 🌐 está fazendo outra coisa</div>
            <p className="mt-1 text-sm text-suave">
              Em Ajustes do Sistema &gt; Teclado, mude "Pressionar tecla 🌐 para" para "Não fazer nada". Senão ela abre emojis ou o ditado do Mac junto.
            </p>
            <Botao className="mt-3" onClick={() => void pedir("ajustes-teclado")}>
              Abrir Ajustes do Teclado
            </Botao>
          </div>
        )}
        {status?.erroAuxiliar && <p className="text-xs text-perigo">{status.erroAuxiliar}</p>}
      </div>
      {status && (!micOk || (mac && !status.acessibilidade)) && (
        <p className="mt-4 text-sm text-suave">Você pode continuar sem tudo liberado, mas o ditado não vai funcionar até liberar.</p>
      )}
    </div>
  );
}

/* 4 ---------------------------------------------------------------- */
export function PassoMicrofone({ prefs }: { prefs: Preferencias | null }) {
  const { nivel, erro } = useNivelMicrofone(prefs ? prefs.microfoneId : undefined, true);
  return (
    <div>
      <Titulo sub="Fale qualquer coisa. A barra deve se mexer com a sua voz.">Teste do microfone</Titulo>
      <div className="h-6 w-full overflow-hidden rounded-full bg-painel ring-1 ring-borda">
        <div className="h-full rounded-full bg-destaque transition-[width] duration-75" style={{ width: `${Math.round(nivel * 100)}%` }} />
      </div>
      {erro ? (
        <p className="mt-3 text-sm text-perigo">{erro}</p>
      ) : (
        <p className="mt-3 text-sm text-suave">
          {nivel > 0.05 ? "✓ Estou ouvindo você." : "Silêncio por enquanto…"} Para trocar de microfone, use as Configurações depois.
        </p>
      )}
    </div>
  );
}

/* 5 ---------------------------------------------------------------- */
export function PassoAtalho({ prefs }: { prefs: Preferencias | null }) {
  const [funcionou, setFuncionou] = useState(false);
  const caixa = useRef<HTMLTextAreaElement>(null);
  const plataforma = window.ponte.plataforma;

  useEffect(() => {
    caixa.current?.focus();
    return window.ponte.historico.aoMudar(() => setFuncionou(true));
  }, []);

  return (
    <div>
      <Titulo
        sub={
          <>
            Clique na caixa abaixo, segure{" "}
            {prefs ? <Atalho teclas={prefs.atalhos.ditado} plataforma={plataforma} /> : "a tecla de ditado"}, diga "Olá, FalaAi" e solte.
          </>
        }
      >
        Teste do atalho
      </Titulo>
      <textarea
        ref={caixa}
        rows={5}
        placeholder="O texto vai aparecer aqui…"
        onChange={(e) => e.target.value.trim() && setFuncionou(true)}
        className="w-full resize-none rounded-xl bg-cartao p-3 text-base outline-none ring-1 ring-borda focus:ring-2 focus:ring-destaque"
      />
      <div className="mt-3 h-6">
        {funcionou ? <span className="text-base font-semibold text-sucesso">✓ Funcionou!</span> : <span className="text-sm text-suave">Esperando você falar…</span>}
      </div>
    </div>
  );
}

/* 6 ---------------------------------------------------------------- */
export function PassoPronto({ prefs }: { prefs: Preferencias | null }) {
  const plataforma = window.ponte.plataforma;
  const ids: IdAtalho[] = ["ditado", "pergunte", "traducao", "colarUltima"];
  return (
    <div>
      <Titulo sub="Seus atalhos:">Tudo pronto!</Titulo>
      <div className="space-y-2">
        {ids.map((id) => (
          <div key={id} className="flex items-center justify-between rounded-xl bg-painel px-4 py-2.5">
            <span className="text-sm font-medium">{NOMES_ATALHOS[id]}</span>
            {prefs && <Atalho teclas={prefs.atalhos[id]} plataforma={plataforma} />}
          </div>
        ))}
      </div>
      <p className="mt-5 text-sm text-suave">
        Dica: um toque rápido no atalho de ditado liga o modo mãos livres (fale à vontade e toque de novo para terminar). <Tecla>Esc</Tecla> cancela a qualquer momento.
      </p>
    </div>
  );
}
