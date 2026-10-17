/** Bandeira 4×3 de um idioma, com anel fino para não sumir em fundo claro (decorativa). */
export function Bandeira({ src }: { src: string }) {
  return <img src={src} alt="" aria-hidden width={20} height={15} className="h-[15px] w-5 shrink-0 rounded-[3px] ring-1 ring-black/10" />;
}
