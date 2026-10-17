import { apiPilula } from "../api/ponte";
import { PilulaVisual } from "../components/PilulaVisual";
import { useComandosPilula } from "../hooks/useComandosPilula";
import { useEstiloPilula } from "../hooks/useEstiloPilula";
import "../estilos.css";

export function PilulaPage() {
  const { estado, nivel } = useComandosPilula();
  const estilo = useEstiloPilula();
  if (estado.estado === "oculta") return null;

  // Erro e aviso são texto: sempre na pílula preta, qualquer que seja o estilo (legibilidade).
  if (estado.estado === "erro" || estado.estado === "aviso") {
    const cor = estado.estado === "erro" ? "text-red-200" : "text-white/90";
    return (
      <div className={`pil-mensagem ${cor}`}>
        <span className="line-clamp-2">{estado.mensagem}</span>
      </div>
    );
  }

  return (
    <PilulaVisual
      estilo={estilo}
      estado={estado.estado}
      modo={estado.modo}
      idioma={estado.idioma}
      nivel={nivel}
      aoCancelar={() => apiPilula.acao("cancelar")}
      aoConfirmar={() => apiPilula.acao("confirmar")}
      aoTrocarIdioma={() => apiPilula.acao("proximo-idioma")}
    />
  );
}
