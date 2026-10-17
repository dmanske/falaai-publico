import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CartaoApp } from "@/features/cartao";
import "./estilos.css";

createRoot(document.getElementById("raiz")!).render(
  <StrictMode>
    <CartaoApp />
  </StrictMode>,
);
