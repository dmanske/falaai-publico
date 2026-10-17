// Tipos do módulo de IA (chamadas ao gateway da Lovable).

export type ParteConteudo =
  | { type: "text"; text: string }
  | { type: "input_audio"; input_audio: { data: string; format: "wav" | "mp3" } }
  | { type: "file"; file: { filename: string; file_data: string } };

export interface MensagemChat {
  role: "system" | "user" | "assistant";
  content: string | ParteConteudo[];
}

export interface PedidoChat {
  chave: string;
  modelo: string;
  mensagens: MensagemChat[];
  timeoutMs?: number;
}

export type RespostaChat =
  | { ok: true; texto: string; ms: number }
  | { ok: false; status: number | null; erro: string; ms: number };
