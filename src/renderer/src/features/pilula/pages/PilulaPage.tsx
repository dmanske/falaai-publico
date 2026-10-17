import { apiPilula } from "../api/ponte";
import { Onda } from "../components/Onda";
import { useComandosPilula } from "../hooks/useComandosPilula";

function Pontos() {
  return (
    <div className="flex h-6 items-center gap-1.5">
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

function BotaoCancelar() {
  return (
    <button
      type="button"
      title="Cancelar (Esc)"
      onClick={() => apiPilula.acao("cancelar")}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}

function BotaoConfirmar({ ativo }: { ativo: boolean }) {
  return (
    <button
      type="button"
      title="Terminar e colar"
      disabled={!ativo}
      onClick={() => apiPilula.acao("confirmar")}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-neutral-950 hover:bg-white/90 disabled:opacity-40"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </button>
  );
}

export function PilulaPage() {
  const { estado, nivel } = useComandosPilula();
  if (estado.estado === "oculta") return null;

  if (estado.estado === "erro") {
    return (
      <div className="flex h-screen w-screen items-center rounded-full bg-neutral-950 px-4 text-xs leading-tight text-red-200">
        <span className="line-clamp-2">{estado.mensagem}</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen items-center justify-between rounded-full bg-neutral-950 px-1.5">
      <BotaoCancelar />
      {estado.estado === "gravando" ? <Onda nivel={nivel} /> : <Pontos />}
      <BotaoConfirmar ativo={estado.estado === "gravando"} />
    </div>
  );
}
