import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PilulaPage } from "@/features/pilula";
import "./estilos.css";

createRoot(document.getElementById("raiz")!).render(
  <StrictMode>
    <PilulaPage />
  </StrictMode>,
);
