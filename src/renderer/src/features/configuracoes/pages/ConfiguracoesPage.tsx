import { FRASE_AMOSTRA, NOME_APP } from "@shared/config";
import { CampoChave } from "../components/CampoChave";
import { Permissoes } from "../components/Permissoes";
import { usePermissoes } from "../hooks/usePermissoes";
import { ResultadoTeste } from "../components/ResultadoTeste";
import { SeletorModelo } from "../components/SeletorModelo";
import { useChaveLovable } from "../hooks/useChaveLovable";
import { usePreferencias } from "../hooks/usePreferencias";
import { useTesteIa } from "../hooks/useTesteIa";

export function ConfiguracoesPage() {
  const chave = useChaveLovable();
  const { preferencias, salvar: salvarPreferencias, recarregar } = usePreferencias();
  const teste = useTesteIa();
  const permissoes = usePermissoes();

  async function testar() {
    await teste.testar();
    await recarregar();
  }

  return (
    <main className="mx-auto max-w-xl space-y-8 p-8">
      <header>
        <h1 className="text-2xl font-semibold">{NOME_APP}</h1>
        <p className="text-sm text-neutral-500">
          Segure <kbd className="rounded border px-1 text-xs">Fn</kbd>, fale e solte. Toque rápido = mãos livres; Esc cancela;
          Ctrl+Cmd+V cola a última de novo. Tudo fica neste computador.
        </p>
      </header>

      {permissoes.status && <Permissoes status={permissoes.status} onPedir={(q) => void permissoes.pedir(q)} />}

      <section className="space-y-6">
        <CampoChave
          status={chave.status}
          erro={chave.erro}
          onSalvar={async (v) => {
            const ok = await chave.salvar(v);
            if (ok) teste.limpar();
            return ok;
          }}
          onApagar={async () => {
            await chave.apagar();
            teste.limpar();
          }}
        />

        {preferencias && (
          <SeletorModelo
            modelo={preferencias.modelo}
            onMudar={(modelo) => {
              void salvarPreferencias({ modelo });
              teste.limpar();
            }}
          />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!chave.status?.configurada || teste.testando}
            onClick={() => void testar()}
            className="shrink-0 whitespace-nowrap rounded-md border border-violet-600 px-4 py-2 text-sm font-medium text-violet-700 disabled:opacity-40 dark:text-violet-300"
          >
            {teste.testando ? "Testando…" : "Testar chave"}
          </button>
          <span className="text-xs text-neutral-500">
            Testa o texto e depois uma amostra de voz (“{FRASE_AMOSTRA}”).
          </span>
        </div>
        {teste.resultado && <ResultadoTeste resultado={teste.resultado} />}
        {preferencias && (
          <p className="text-xs text-neutral-500">
            Áudio:{" "}
            {preferencias.formatoAudio
              ? `pronto para ditado (formato "${preferencias.formatoAudio}")`
              : "ainda não confirmado — rode o teste"}
          </p>
        )}
      </section>
    </main>
  );
}
