import { NOME_APP } from "@shared/config";
import { IconeMarca } from "./Icones";

export function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-3">
      <IconeMarca />
      <span className="font-titulo text-[26px] font-semibold tracking-[-0.01em]">{NOME_APP}</span>
    </div>
  );
}
