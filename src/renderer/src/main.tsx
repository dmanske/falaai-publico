import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HubApp } from "@/features/hub";
import "./estilos.css";

createRoot(document.getElementById("raiz")!).render(
  <StrictMode>
    <HubApp />
  </StrictMode>,
);
