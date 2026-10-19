// Liga o nome de um microfone do navegador (Chromium) ao dispositivo do CoreAudio, que sabe o tipo
// (embutido, Bluetooth, USB…). Sem imports de Node ou de DOM: usado pela tela e pelo menu da bandeja.
import type { EntradaAudio } from "./ipc/sistema";

const ROTULOS_TRANSPORTE: Record<string, string> = {
  embutido: "embutido",
  bluetooth: "Bluetooth",
  usb: "USB",
  iphone: "iPhone",
  airplay: "AirPlay",
  thunderbolt: "Thunderbolt",
  virtual: "virtual",
  pci: "PCI",
  firewire: "FireWire",
  hdmi: "HDMI",
  displayport: "DisplayPort",
  agregado: "agregado",
};

/** Tipo do microfone em português para mostrar entre parênteses; null quando não se sabe. */
export function rotuloTransporte(transporte: string | undefined | null): string | null {
  return (transporte && ROTULOS_TRANSPORTE[transporte]) || null;
}

const normalizar = (t: string) => t.trim().toLowerCase();

/**
 * Acha a entrada do CoreAudio que corresponde ao nome do Chromium: igualdade, depois
 * `label.startsWith(nome)` e `label.includes(nome)`. Se mais de uma serve, vale a de nome mais longo
 * (mais específico).
 */
export function acharEntrada(label: string, entradas: EntradaAudio[]): EntradaAudio | null {
  const alvo = normalizar(label);
  if (!alvo) return null;
  const passos: ((nome: string) => boolean)[] = [(n) => alvo === n, (n) => alvo.startsWith(n), (n) => alvo.includes(n)];
  for (const casa of passos) {
    const achadas = entradas.filter((e) => e.nome.trim() !== "" && casa(normalizar(e.nome)));
    if (achadas.length) return achadas.reduce((a, b) => (b.nome.length > a.nome.length ? b : a));
  }
  return null;
}
