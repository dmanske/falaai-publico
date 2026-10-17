import type { ResultadoEtapa, ResultadoTesteIa } from "@shared/ipc";

function Linha({ titulo, etapa }: { titulo: string; etapa: ResultadoEtapa }) {
  return (
    <div className={`rounded-md border p-3 text-sm ${etapa.ok ? "border-green-500/40 bg-green-500/5" : "border-red-500/40 bg-red-500/5"}`}>
      <div className="flex items-center justify-between font-medium">
        <span>
          {etapa.ok ? "✓" : "✗"} {titulo}
        </span>
        {etapa.ms > 0 && <span className="text-xs font-normal text-neutral-500">{(etapa.ms / 1000).toFixed(1)} s</span>}
      </div>
      <p className="mt-1 text-neutral-600 dark:text-neutral-400">{etapa.mensagem}</p>
      {etapa.resposta && (
        <p className="mt-1 text-xs text-neutral-500">
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
