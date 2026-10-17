// Ícones simples em SVG (traço, herdam a cor do texto).
import type { ReactNode } from "react";

function Base({ children, tamanho = 20 }: { children: ReactNode; tamanho?: number }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const IconeInicio = () => (
  <Base>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5.5 10v9.5h13V10" />
  </Base>
);
export const IconeHistorico = () => (
  <Base>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Base>
);
export const IconeDicionario = () => (
  <Base>
    <path d="M5 4.5h11a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3V4.5Z" />
    <path d="M5 17a3 3 0 0 1 3-3h11" />
  </Base>
);
export const IconeConfig = () => (
  <Base>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </Base>
);
export const IconeSobre = () => (
  <Base>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </Base>
);

/** Símbolo do FalaAi (o mesmo do ícone do app): balão de fala com a onda, a barra do meio em azul. */
export function IconeMarca({ tamanho = 28 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id="falaai-balao" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3a3a" />
          <stop offset="1" stopColor="#050505" />
        </linearGradient>
      </defs>
      <path
        d="M10 5.5h12a8.5 8.5 0 0 1 0 17h-8.3c-1.6 1.9-3.9 3.1-6.4 3.4.9-1 1.5-2.3 1.6-3.6A8.5 8.5 0 0 1 10 5.5Z"
        fill="url(#falaai-balao)"
        strokeWidth="0.8"
        className="stroke-transparent dark:stroke-white/30"
      />
      <rect x="7.6" y="12.2" width="2" height="4.6" rx="1" fill="white" />
      <rect x="11.3" y="10.4" width="2" height="8.2" rx="1" fill="white" />
      <rect x="15" y="8.6" width="2" height="11.8" rx="1" className="fill-destaque" />
      <rect x="18.7" y="10.4" width="2" height="8.2" rx="1" fill="white" />
      <rect x="22.4" y="12.2" width="2" height="4.6" rx="1" fill="white" />
    </svg>
  );
}
