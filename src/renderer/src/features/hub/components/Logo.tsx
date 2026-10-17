import { NOME_APP } from "@shared/config";
import { IconeMarca } from "./Icones";

export function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-3">
      <IconeMarca />
      <span className="text-2xl font-bold tracking-tight">{NOME_APP}</span>
    </div>
  );
}
