import { useCallback, useState } from "react";
import { Botao } from "@/components/ui";
import { PassoAtalho, PassoBoasVindas, PassoMicrofone, PassoPermissoes, PassoPronto } from "../components/Passos";
import { PassoChave } from "../components/PassoChave";
import { usePreferencias } from "../hooks/usePreferencias";
import { useTema } from "../hooks/useTema";

const TOTAL = 6;

export function OnboardingApp() {
  useTema();
  const prefs = usePreferencias();
  const [passo, setPasso] = useState(0);
  const [temChave, setTemChave] = useState(false);
  const aoStatusChave = useCallback((c: boolean) => setTemChave(c), []);

  const bloqueado = passo === 1 && !temChave;
  const ultimo = passo === TOTAL - 1;

  return (
    <div className="flex h-screen flex-col bg-fundo text-texto">
      <div className="flex gap-1.5 px-10 pt-8" aria-label={`Passo ${passo + 1} de ${TOTAL}`}>
        {Array.from({ length: TOTAL }, (_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition ${i <= passo ? "bg-destaque" : "bg-borda"}`} />
        ))}
      </div>

      <main className="flex-1 overflow-y-auto px-10 py-8">
        {passo === 0 && <PassoBoasVindas prefs={prefs} />}
        {passo === 1 && <PassoChave aoStatus={aoStatusChave} />}
        {passo === 2 && <PassoPermissoes />}
        {passo === 3 && <PassoMicrofone prefs={prefs} />}
        {passo === 4 && <PassoAtalho prefs={prefs} />}
        {passo === 5 && <PassoPronto prefs={prefs} />}
      </main>

      <footer className="flex items-center justify-between border-t border-borda px-10 py-4">
        <Botao variante="fantasma" disabled={passo === 0} onClick={() => setPasso((p) => p - 1)}>
          Voltar
        </Botao>
        <span className="text-xs text-suave">
          {passo + 1} de {TOTAL}
        </span>
        {ultimo ? (
          <Botao variante="primario" onClick={() => void window.ponte.janelas.concluirOnboarding()}>
            Começar
          </Botao>
        ) : (
          <Botao variante="primario" disabled={bloqueado} onClick={() => setPasso((p) => p + 1)}>
            Continuar
          </Botao>
        )}
      </footer>
    </div>
  );
}
