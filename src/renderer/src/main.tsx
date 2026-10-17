import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfiguracoesPage } from "@/features/configuracoes";
import "./estilos.css";

createRoot(document.getElementById("raiz")!).render(
  <StrictMode>
    <ConfiguracoesPage />
  </StrictMode>,
);
