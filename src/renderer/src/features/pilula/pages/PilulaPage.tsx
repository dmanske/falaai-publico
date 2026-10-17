import { Onda } from "../components/Onda";
import { useComandosPilula } from "../hooks/useComandosPilula";

function Pontos() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-white"
          style={{ animation: `pulo 1s ${i * 0.15}s infinite ease-in-out` }}
        />
      ))}
    </div>
  );
}

export function PilulaPage() {
  const { estado, nivel } = useComandosPilula();
  if (estado.estado === "oculta") return null;

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="flex h-11 max-w-[210px] items-center gap-2 rounded-full bg-neutral-900/90 px-4 text-xs text-white shadow-lg ring-1 ring-white/10">
        {estado.estado === "gravando" && (
          <>
            <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
            <Onda nivel={nivel} />
            {estado.maosLivres && <span className="shrink-0 text-[10px] text-white/70">Fn p/ parar</span>}
          </>
        )}
        {estado.estado === "processando" && <Pontos />}
        {estado.estado === "erro" && <span className="line-clamp-2 leading-tight text-red-200">{estado.mensagem}</span>}
      </div>
    </div>
  );
}
