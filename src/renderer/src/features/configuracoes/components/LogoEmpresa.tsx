import { LOGOS, LOGOS_MONOCROMATICOS, type IdLogo } from "../lib/logos";

/** Logo decorativo de um provedor/serviço (o nome já aparece em texto ao lado). */
export function LogoEmpresa({ id, tamanho }: { id: IdLogo; tamanho: number }) {
  return (
    <img
      src={LOGOS[id]}
      alt=""
      aria-hidden
      width={tamanho}
      height={tamanho}
      className={`shrink-0 object-contain ${LOGOS_MONOCROMATICOS.has(id) ? "dark:invert" : ""}`}
      style={{ width: tamanho, height: tamanho }}
    />
  );
}
