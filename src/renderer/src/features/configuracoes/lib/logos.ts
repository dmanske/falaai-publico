// Logos das empresas (provedores de IA e serviços de transcrição). Licenças: src/renderer/src/assets/LICENCAS.md
import type { IdProvedor, IdTranscricao } from "@shared/provedores";
import claude from "@/assets/logos/claude.svg";
import deepgram from "@/assets/logos/deepgram.svg";
import deepseek from "@/assets/logos/deepseek.svg";
import elevenlabs from "@/assets/logos/elevenlabs.svg";
import gemini from "@/assets/logos/gemini.svg";
import groq from "@/assets/logos/groq.svg";
import lovable from "@/assets/logos/lovable.svg";
import mistral from "@/assets/logos/mistral.svg";
import openai from "@/assets/logos/openai.svg";
import openrouter from "@/assets/logos/openrouter.svg";

export type IdLogo = IdProvedor | IdTranscricao;

/** URL do SVG de cada empresa (a Anthropic usa o logo do Claude). */
export const LOGOS: Record<IdLogo, string> = {
  lovable,
  gemini,
  openrouter,
  openai,
  anthropic: claude,
  groq,
  mistral,
  deepseek,
  elevenlabs,
  deepgram,
};

/** Logos de uma cor só (currentColor): ficam pretos no claro e precisam inverter no escuro. */
export const LOGOS_MONOCROMATICOS: ReadonlySet<IdLogo> = new Set<IdLogo>(["openrouter", "openai", "groq", "elevenlabs", "deepgram"]);
