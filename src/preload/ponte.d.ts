import type { Ponte } from "../shared/ipc";

declare global {
  interface Window {
    ponte: Ponte;
  }
}

export {};
