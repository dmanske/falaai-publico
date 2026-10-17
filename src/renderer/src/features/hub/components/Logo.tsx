import { NOME_APP } from "@shared/config";
import logo from "@/assets/marca/logo.png";

/** Logo do FalaAi (já traz o nome); no modo escuro fica invertido (preto vira branco). */
export function Logo() {
  return (
    <div className="flex items-center px-3">
      <img src={logo} alt={NOME_APP} className="logo-marca h-7 w-auto dark:invert" />
    </div>
  );
}
