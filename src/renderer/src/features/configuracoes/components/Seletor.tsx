import type { ReactNode, SelectHTMLAttributes } from "react";

/** Lista suspensa no estilo do app. */
export function Seletor({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select
      {...props}
      className={`rounded-xl bg-cartao px-3 py-2 text-sm text-texto outline-none ring-1 ring-borda focus:ring-2 focus:ring-destaque ${className}`}
    >
      {children}
    </select>
  );
}
