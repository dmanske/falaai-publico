import { Interruptor } from "@/components/ui";
import { useAppsUsados } from "../../hooks/useAppsUsados";
import type { PropsSecaoPreferencias } from "../../types";
import { CartaoSecao } from "../CartaoSecao";

export function SecaoEnvio({ preferencias, salvar }: PropsSecaoPreferencias) {
  const apps = useAppsUsados(preferencias.enviarNosApps);

  function alternar(appId: string, ligado: boolean) {
    const resto = preferencias.enviarNosApps.filter((id) => id !== appId);
    void salvar({ enviarNosApps: ligado ? [...resto, appId] : resto });
  }

  return (
    <CartaoSecao
      titulo="Envio automático"
      descricao="Depois de colar o ditado, o FalaAi aperta Enter para enviar — só nos apps que você marcar."
    >
      <Interruptor
        ligado={preferencias.enviarPorVoz}
        aoMudar={(enviarPorVoz) => void salvar({ enviarPorVoz })}
        rotulo="Comando de voz “enviar”"
        descricao="Termine a fala com “enviar” ou “manda” para enviar só daquela vez, em qualquer app."
      />

      <div className="py-3">
        <span className="block text-sm font-medium">Apps</span>
        {apps === null ? (
          <p className="mt-2 text-sm text-suave">Carregando…</p>
        ) : apps.length === 0 ? (
          <p className="mt-2 text-sm text-suave">Dite em algum app primeiro; ele aparece aqui.</p>
        ) : (
          <div className="mt-1 max-h-96 divide-y divide-borda overflow-y-auto">
            {apps.map((a) => (
              <Interruptor
                key={a.appId}
                ligado={preferencias.enviarNosApps.includes(a.appId)}
                aoMudar={(v) => alternar(a.appId, v)}
                rotulo={
                  <span className="inline-flex items-center gap-2">
                    {a.nome}
                    {a.comum && <span className="rounded-full bg-painel px-1.5 py-px text-[10px] font-medium text-suave">comum</span>}
                  </span>
                }
                descricao={a.usos > 0 ? `${a.usos} ${a.usos === 1 ? "ditado" : "ditados"}` : "sem ditados recentes"}
              />
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-suave">Em editores de texto e e-mail o Enter só pula linha — marque só apps de conversa.</p>
      </div>
    </CartaoSecao>
  );
}
