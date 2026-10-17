import type { ResultadoEtapa, ResultadoTesteIa } from "@shared/ipc";

function Linha({ titulo, etapa }: { titulo: string; etapa: ResultadoEtapa }) {
  return (
    <div className={`rounded-xl p-3 text-sm ring-1 ${etapa.ok ? "bg-sucesso/10 ring-sucesso/40" : "bg-perigo/10 ring-perigo/40"}`}>
      <div className="flex items-center justify-between font-medium">
        <span className={etapa.ok ? "text-sucesso" : "text-perigo"}>
          {etapa.ok ? "✓" : "✗"} {titulo}
        </span>
        {etapa.ms > 0 && <span className="text-xs font-normal text-suave">{(etapa.ms / 1000).toFixed(1)} s</span>}
      </div>
      <p className="mt-1 text-suave">{etapa.mensagem}</p>
      {etapa.resposta && (
        <p className="mt-1 text-xs text-suave">
          Resposta da IA: <em>“{etapa.resposta}”</em>
        </p>
      )}
    </div>
  );
}

export function ResultadoTeste({ resultado }: { resultado: ResultadoTesteIa }) {
  return (
    <div className="space-y-2">
      <Linha titulo="Texto" etapa={resultado.texto} />
      {resultado.audio && <Linha titulo="Áudio (transcrição da amostra)" etapa={resultado.audio} />}
    </div>
  );
}
